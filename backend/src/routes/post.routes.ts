import { Router, Request, Response } from "express";
import { AppDataSource } from "../db";
import type {
  PostListDto,
  PostDetailDto,
  CategoryDto,
  PostImageDto,
  PostFileDto,
  CommentListDto,
  CommentCreateData,
  MyPostDto,
} from "../../../shared/post.types";
import { Post } from "../typeorm/posts.entity";
import { Category } from "../typeorm/categories.entity";
import { PostCategory } from "../typeorm/postCategories.entity";
import { AuthenticatedRequest, isAuthenticated, optionalAuth } from "../middlewares/auth.middleware";
import { PostLike } from "../typeorm/postLikes.entity";
import { Comment } from "../typeorm/comments.entity";
import { CommentLike } from "../typeorm/commentLikes.entity";
import { handleError } from "../utils/errorHandler";

const router = Router();

router.post("/like/:postId", isAuthenticated, async (req: AuthenticatedRequest, res) => {
  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    const { postId } = req.params;
    const userId = req.user?.id;
    const postIdNumber = Number(postId);

    if (!userId) {
      await queryRunner.rollbackTransaction();
      return res.status(401).json({
        success: false,
        message: "로그인이 필요합니다.",
      });
    }

    if (isNaN(postIdNumber)) {
      await queryRunner.rollbackTransaction();
      return res.status(400).json({ success: false, message: "유효하지 않은 게시글 ID입니다." });
    }

    const post = await queryRunner.manager.findOne(Post, { where: { id: postIdNumber } });
    if (!post) {
      await queryRunner.rollbackTransaction();
      return res.status(404).json({ success: false, message: "게시글을 찾을 수 없습니다." });
    }

    // 중복 좋아요 체크
    const existingLike = await queryRunner.manager.findOne(PostLike, {
      where: { postId: postIdNumber, userId },
    });

    let isLiked = false;
    if (existingLike) {
      // 좋아요 취소
      isLiked = false;
      post.likeCount--;
      await queryRunner.manager.remove(existingLike);
    } else {
      // 게시글 좋아요 수 증가
      isLiked = true;
      post.likeCount++;

      const postLike = new PostLike();
      postLike.postId = postIdNumber;
      postLike.userId = userId;
      await queryRunner.manager.save(postLike);
    }
    await queryRunner.manager.save(post);
    await queryRunner.commitTransaction();

    res.status(200).json({
      success: true,
      data: isLiked,
    });
  } catch (error) {
    await queryRunner.rollbackTransaction();
    handleError(error, req, res, {
      message: "좋아요 처리 중 오류가 발생했습니다.",
      errorCode: "TOGGLE_POST_LIKE_ERROR",
      additionalContext: { postId: req.params.postId },
    });
  } finally {
    await queryRunner.release();
  }
});

router.get("/my", isAuthenticated, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "로그인이 필요합니다.",
      });
    }

    // TypeORM을 사용하여 사용자가 작성한 게시글 조회
    const posts = await AppDataSource.manager
      .createQueryBuilder(Post, "p")
      .leftJoinAndSelect("p.postCategories", "pc")
      .leftJoinAndSelect("pc.category", "c")
      .where("p.userId = :userId", { userId })
      .andWhere("p.isDeleted = false")
      .orderBy("p.createdAt", "DESC")
      .getMany();

    // MyPostDto 형태로 데이터 변환
    const myPosts: MyPostDto[] = posts.map((post) => {
      // 게시글은 단 하나의 카테고리에만 속함
      const category = post.postCategories?.[0]?.category;

      return {
        id: post.id,
        title: post.title,
        thumbnailUrl: post.thumbnailUrl || "",
        createdAt: post.createdAt,
        categoryId: category?.id || 0,
        categoryName: category?.name || "알수없음",
        categoryDesc: category?.description || "알수없음",
      };
    });

    res.status(200).json({
      success: true,
      data: myPosts,
    });
  } catch (error) {
    handleError(error, req, res, {
      message: "내가 쓴 게시글을 불러오는 중 오류가 발생했습니다.",
      errorCode: "FETCH_MY_POSTS_ERROR",
    });
  }
});

// 내가 쓴 댓글 조회
router.get("/my-comment", isAuthenticated, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "로그인이 필요합니다.",
      });
    }

    // TypeORM을 사용하여 사용자가 작성한 댓글의 게시글 조회 (중복 제거)
    const comments = await AppDataSource.manager
      .createQueryBuilder(Comment, "c")
      .leftJoinAndSelect("c.post", "p")
      .leftJoinAndSelect("p.postCategories", "pc")
      .leftJoinAndSelect("pc.category", "c2")
      .where("c.userId = :userId", { userId })
      .andWhere("c.isDeleted = false")
      .andWhere("p.isDeleted = false")
      .orderBy("c.createdAt", "DESC")
      .getMany();

    // 게시글 ID로 중복 제거 (가장 최근 댓글 기준)
    const uniquePostsMap = new Map<number, MyPostDto>();

    comments.forEach((comment) => {
      const post = comment.post;
      const postId = post?.id || 0;

      // 이미 해당 게시글이 추가되지 않은 경우에만 추가
      if (!uniquePostsMap.has(postId) && postId !== 0) {
        // 게시글은 단 하나의 카테고리에만 속함
        const category = post?.postCategories?.[0]?.category;

        uniquePostsMap.set(postId, {
          id: postId,
          title: post?.title || "삭제된 게시글",
          thumbnailUrl: post?.thumbnailUrl || "",
          createdAt: comment.createdAt, // 가장 최근 댓글 작성일
          categoryId: category?.id || 0,
          categoryName: category?.name || "알수없음",
          categoryDesc: category?.description || "알수없음",
        });
      }
    });

    // Map을 배열로 변환
    const myComments: MyPostDto[] = Array.from(uniquePostsMap.values());

    res.status(200).json({
      success: true,
      data: myComments,
    });
  } catch (error) {
    handleError(error, req, res, {
      message: "내가 쓴 댓글을 불러오는 중 오류가 발생했습니다.",
      errorCode: "FETCH_MY_COMMENTS_ERROR",
    });
  }
});

// 최근 게시글 조회 (카테고리별)
router.get("/recent-posts", async (req, res) => {
  try {
    const query = `
      WITH RankedPosts AS (
          SELECT
              p.id AS postId,
              p.title AS title,
              p.created_at AS createdAt,
              pc.category_id AS categoryId,
              c.name AS categoryName,
              c.description AS categoryDesc,
              ROW_NUMBER() OVER(PARTITION BY pc.category_id ORDER BY p.created_at DESC) AS rn
          FROM
              posts p
          JOIN
              post_categories pc ON p.id = pc.post_id
          JOIN
              categories c ON pc.category_id = c.id
          WHERE
              c.description LIKE '%게시판'
      )
      SELECT
          postId,
          title,
          createdAt,
          categoryId,
          categoryName,
          categoryDesc
      FROM
          RankedPosts
      WHERE
          rn <= 3
      ORDER BY
          categoryName, createdAt DESC;
    `;

    const result = await AppDataSource.query(query);

    // 데이터 가공: 카테고리별로 그룹화
    const boardsMap = new Map();

    result.forEach(
      (row: {
        categoryId: number;
        categoryName: string;
        categoryDesc: string;
        postId: number;
        title: string;
        createdAt: string;
      }) => {
        const categoryId = row.categoryId;

        if (!boardsMap.has(categoryId)) {
          boardsMap.set(categoryId, {
            board: {
              id: categoryId,
              name: row.categoryName,
              description: row.categoryDesc,
            },
            posts: [],
          });
        }

        boardsMap.get(categoryId).posts.push({
          id: row.postId,
          title: row.title,
          createdAt: row.createdAt,
        });
      },
    );

    const boards = Array.from(boardsMap.values());
    res.status(200).json({
      success: true,
      data: boards,
    });
  } catch (error) {
    handleError(error, req, res, {
      message: "최근 게시글 조회 중 오류가 발생했습니다.",
      errorCode: "FETCH_RECENT_POSTS_ERROR",
    });
  }
});

// 특정 카테고리의 게시글 목록 조회
router.get("/:category", async (req, res) => {
  try {
    const { category } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 15;
    const offset = (page - 1) * limit;

    // 전체 게시글 수 조회
    const countQuery = `
      SELECT COUNT(*) as total
      FROM categories c 
      JOIN post_categories pc ON c.id = pc.category_id 
      JOIN posts p ON pc.post_id = p.id 
      WHERE c.name = ? AND p.is_deleted = false
    `;

    const countResult = await AppDataSource.query(countQuery, [category]);
    const totalPosts = countResult[0].total;
    const totalPages = Math.ceil(totalPosts / limit);

    // 카테고리명으로 게시글 목록 조회 (페이징 적용)
    const query = `
      SELECT 
        p.id AS id,
        p.title AS title,
        p.thumbnail_url AS thumbnailUrl,
        p.view_count AS viewCount,
        p.like_count AS likeCount,
        p.created_at AS createdAt,
        u.id AS authorId,
        u.nickname AS authorNickname,
        u.profile_image_url AS authorProfileImageUrl,
        c.id AS categoryId,
        c.name AS categoryName,
        (SELECT COUNT(id) FROM comments WHERE post_id = p.id) AS commentCount
      FROM categories c 
      JOIN post_categories pc ON c.id = pc.category_id 
      JOIN posts p ON pc.post_id = p.id 
      JOIN users u ON p.user_id = u.id 
      WHERE c.name = ? AND p.is_deleted = false
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const posts: PostListDto[] = await AppDataSource.query(query, [category, limit, offset]);

    res.status(200).json({
      success: true,
      data: {
        posts: posts,
        pagination: {
          currentPage: page,
          totalPages,
          totalPosts,
          postsPerPage: limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      },
    });
  } catch (error) {
    handleError(error, req, res, {
      message: "게시글 목록을 불러오는 중 오류가 발생했습니다.",
      errorCode: "FETCH_POST_LIST_ERROR",
      additionalContext: { category: req.params.category, page: req.query.page, limit: req.query.limit },
    });
  }
});

// 게시글 작성
router.post("/write/:category", async (req, res) => {
  const { category } = req.params;
  const { title, content, userId } = req.body;

  // 트랜잭션 시작
  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    // 카테고리 존재 여부 확인
    const categoryEntity = await queryRunner.manager.findOne(Category, {
      where: { name: category },
    });

    if (!categoryEntity) {
      await queryRunner.rollbackTransaction();
      return res.status(404).json({
        success: false,
        message: "존재하지 않은 카테고리입니다.",
      });
    }

    // 게시글 생성
    const newPost = new Post();
    newPost.title = title;
    newPost.content = content;
    newPost.userId = userId;
    newPost.viewCount = 0;
    newPost.likeCount = 0;

    const savedPost = await queryRunner.manager.save(Post, newPost);

    // 게시글-카테고리 연결 생성
    const newPostCategory = new PostCategory();
    newPostCategory.postId = savedPost.id;
    newPostCategory.categoryId = categoryEntity.id;

    await queryRunner.manager.save(PostCategory, newPostCategory);

    // 트랜잭션 커밋
    await queryRunner.commitTransaction();

    res.status(201).json({
      success: true,
      data: savedPost,
    });
  } catch (error) {
    // 트랜잭션 롤백
    await queryRunner.rollbackTransaction();
    handleError(error, req, res, {
      message: "게시글 저장 중 오류가 발생했습니다.",
      errorCode: "CREATE_POST_ERROR",
      additionalContext: { category: req.params.category },
    });
  } finally {
    // QueryRunner 해제
    await queryRunner.release();
  }
});

// 게시글 상세 조회
router.get("/detail/:id", optionalAuth, async (req: AuthenticatedRequest, res) => {
  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    const { id } = req.params;
    const postId = parseInt(id);
    const userId = req.user?.id;

    if (isNaN(postId) || postId <= 0) {
      return res.status(400).json({
        success: false,
        message: "유효하지 않은 게시글 ID입니다.",
      });
    }

    if (!req.session.viewedPosts) {
      req.session.viewedPosts = [];
    }

    // 게시글 상세 정보 조회 쿼리
    const query = `
      SELECT 
        p.id AS id,
        p.user_id AS userId,
        p.title AS title,
        p.thumbnail_url AS thumbnailUrl,
        p.content AS content,
        p.view_count AS viewCount,
        p.like_count AS likeCount,
        p.is_deleted AS isDeleted,
        p.created_at AS createdAt,
        p.updated_at AS updatedAt,
        u.id AS authorId,
        u.nickname AS authorNickname,
        u.profile_image_url AS authorProfileImageUrl
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.id = ? AND p.is_deleted = false
    `;

    const postResult = await queryRunner.query(query, [postId]);

    if (!postResult || postResult.length === 0) {
      await queryRunner.rollbackTransaction();
      return res.status(404).json({
        success: false,
        message: "게시글을 찾을 수 없습니다.",
      });
    }

    const postData = postResult[0];

    // 조회수 증가 (트랜잭션 내에서 처리)
    if (!req.session.viewedPosts.includes(postId)) {
      await queryRunner.query(`UPDATE posts SET view_count = view_count + 1 WHERE id = ?`, [postId]);
      req.session.viewedPosts.push(postId);
    }

    // 카테고리 정보 조회
    const categoriesQuery = `
      SELECT c.id, c.name
      FROM categories c
      JOIN post_categories pc ON c.id = pc.category_id
      WHERE pc.post_id = ?
    `;
    const categories = await queryRunner.query(categoriesQuery, [postId]);

    // 댓글 정보 조회 (작성자 정보 포함, 현재 사용자의 좋아요 여부 포함)
    const commentsQuery = `
                  SELECT
                    c.id AS id,
                    c.post_id AS postId,
                    c.user_id AS userId,
                    c.parent_id AS parentId,
                    c.content AS content,
                    c.like_count AS likeCount,
                    c.is_deleted AS isDeleted,
                    c.created_at AS createdAt,
                    c.updated_at AS updatedAt,
                    u.nickname AS authorNickname,
                    u.profile_image_url AS authorProfileImageUrl,
                    CASE 
                      WHEN ? IS NULL THEN 0
                      WHEN cl.comment_id IS NOT NULL THEN 1 
                      ELSE 0 
                    END AS isLiked
                  FROM comments c
                  JOIN users u ON c.user_id = u.id
                  LEFT JOIN comment_likes cl ON c.id = cl.comment_id AND cl.user_id = ?
                  WHERE c.post_id = ? AND c.is_deleted = false
                  ORDER BY c.created_at ASC
                `;
    const comments = await queryRunner.query(commentsQuery, [userId, userId, postId]);

    // 이미지 정보 조회
    const imagesQuery = `
      SELECT id, post_id AS postId, image_url AS imageUrl, uploaded_at AS uploadedAt
      FROM post_images
      WHERE post_id = ?
    `;
    const images = await queryRunner.query(imagesQuery, [postId]);

    // 파일 정보 조회
    const filesQuery = `
      SELECT id, post_id AS postId, file_name AS fileName, file_url AS fileUrl, file_size AS fileSize, uploaded_at AS uploadedAt
      FROM post_files
      WHERE post_id = ?
    `;
    const files = await queryRunner.query(filesQuery, [postId]);

    // 현재 사용자의 '게시글' 좋아요 여부 확인
    let isLiked = false;
    if (userId) {
      const likeQuery = `
        SELECT post_id
        FROM post_likes
        WHERE post_id = ? AND user_id = ?
      `;
      const likeResult = await queryRunner.query(likeQuery, [postId, userId]);
      isLiked = likeResult && likeResult.length > 0;
    }

    // 트랜잭션 커밋
    await queryRunner.commitTransaction();

    // PostDetailDto 형식으로 데이터 구성
    const postDetail: PostDetailDto = {
      id: postData.id,
      userId: postData.userId,
      title: postData.title,
      thumbnailUrl: postData.thumbnailUrl || "",
      content: postData.content,
      viewCount: postData.viewCount + 1, // 증가된 조회수 반영
      isLiked: isLiked,
      likeCount: postData.likeCount,
      isDeleted: Boolean(postData.isDeleted),
      createdAt: new Date(postData.createdAt),
      updatedAt: postData.updatedAt ? new Date(postData.updatedAt) : undefined,
      authorId: postData.authorId,
      authorNickname: postData.authorNickname,
      authorProfileImageUrl: postData.authorProfileImageUrl || "",
      categories: (categories as { id: number; name: string }[]).map(
        (cat): Pick<CategoryDto, "id" | "name"> => ({
          id: cat.id,
          name: cat.name,
        }),
      ),
      comments: (
        comments as {
          id: number;
          content: string;
          likeCount: number;
          createdAt: string;
          parentId: number | null;
          userId: number;
          authorNickname: string;
          authorProfileImageUrl: string | null;
          isLiked: number;
        }[]
      ).map(
        (comment): CommentListDto => ({
          id: comment.id,
          content: comment.content,
          isLiked: Boolean(comment.isLiked == 1),
          likeCount: comment.likeCount,
          createdAt: new Date(comment.createdAt),
          parentId: comment.parentId || undefined,
          author: {
            id: comment.userId,
            nickname: comment.authorNickname,
            profileImageUrl: comment.authorProfileImageUrl || "",
          },
        }),
      ),
      images: (images as { id: number; postId: number; imageUrl: string; uploadedAt: string }[]).map(
        (img): PostImageDto => ({
          id: img.id,
          postId: img.postId,
          imageUrl: img.imageUrl,
          uploadedAt: new Date(img.uploadedAt),
        }),
      ),
      files: (
        files as {
          id: number;
          postId: number;
          fileName: string;
          fileUrl: string;
          fileSize: number;
          uploadedAt: string;
        }[]
      ).map(
        (file): PostFileDto => ({
          id: file.id,
          postId: file.postId,
          fileName: file.fileName,
          fileUrl: file.fileUrl,
          fileSize: file.fileSize,
          uploadedAt: new Date(file.uploadedAt),
        }),
      ),
    };

    res.json({
      success: true,
      data: postDetail,
    });
  } catch (error) {
    await queryRunner.rollbackTransaction();
    handleError(error, req, res, {
      message: "게시글을 불러오는 중 오류가 발생했습니다.",
      errorCode: "FETCH_POST_DETAIL_ERROR",
      additionalContext: { postId: req.params.id },
    });
  } finally {
    await queryRunner.release();
  }
});

router.post("/delete/:id", isAuthenticated, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const postId = parseInt(id);

    if (isNaN(postId) || postId <= 0) {
      return res.status(400).json({ success: false, message: "유효하지 않은 게시글 ID입니다." });
    }

    const post = await AppDataSource.manager.findOne(Post, { where: { id: postId } });
    if (!post) {
      return res.status(404).json({ success: false, message: "게시글을 찾을 수 없습니다." });
    }
    if (post.userId !== userId) {
      return res.status(403).json({ success: false, message: "권한이 없습니다." });
    }
    post.isDeleted = true;
    await AppDataSource.manager.save(post);
    return res.status(200).json({ success: true, message: "게시글이 삭제되었습니다." });
  } catch (error) {
    handleError(error, req, res, {
      message: "게시글 삭제에 실패했습니다.",
      errorCode: "DELETE_POST_ERROR",
      additionalContext: { postId: req.params.id },
    });
  }
});

router.post("/update/:id", isAuthenticated, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const postId = parseInt(id);
    if (isNaN(postId) || postId <= 0) {
      return res.status(400).json({ success: false, message: "유효하지 않은 게시글 ID입니다." });
    }
    const post = await AppDataSource.manager.findOne(Post, { where: { id: postId } });
    if (!post) return res.status(404).json({ success: false, message: "게시글을 찾을 수 없습니다." });
    if (post.userId !== userId) return res.status(403).json({ success: false, message: "권한이 없습니다." });
    post.title = req.body.title;
    post.content = req.body.content;
    const savedPost = await AppDataSource.manager.save(post);
    return res.status(200).json({
      success: true,
      data: savedPost,
    });
  } catch (error) {
    handleError(error, req, res, {
      message: "게시글 수정에 실패했습니다.",
      errorCode: "UPDATE_POST_ERROR",
      additionalContext: { postId: req.params.id },
    });
  }
});

// TODO: Report 테이블 생성 후 신고 처리 ㄱㄱ
// router.post("/report/:id", isAuthenticated, async (req: AuthenticatedRequest, res) => {
//    try {
//      const { id } = req.params;
//      const userId = req.user?.id;
//      const postId = parseInt(id);
//      if (isNaN(postId) || postId <= 0) {
//        return res.status(400).json({ success: false, message: "유효하지 않은 게시글 ID입니다." });
//      }
//      const post = await AppDataSource.manager.findOne(Post, { where: { id: postId } });
//      if (!post) return res.status(404).json({ success: false, message: "게시글을 찾을 수 없습니다." });
//      await AppDataSource.manager.save(post);
//      return res.status(200).json({ success: true, message: "게시글이 신고되었습니다." });
//    } catch (error) {
//      console.error("신고 처리도중 오류:", error);
//      res.status(500).json({
//        success: false,
//        message: "신고에 실패했습니다.",
//        error: error instanceof Error ? error.message : "알 수 없는 오류",
//      });
//    }
// });

// 인기 게시글 조회 (3일 전부터 현재까지 좋아요 수가 많은 게시글 5개)
router.get("/popular/:category", async (req, res) => {
  const { category } = req.params;
  try {
    // 3일 전 날짜 계산
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    // 인기 게시글 조회 쿼리
    const query = `
      SELECT 
        p.id AS id,
        p.title AS title,
        p.thumbnail_url AS thumbnailUrl,
        p.view_count AS viewCount,
        p.like_count AS likeCount,
        p.created_at AS createdAt,
        u.id AS authorId,
        u.nickname AS authorNickname,
        u.profile_image_url AS authorProfileImageUrl,
        c.id AS categoryId,
        c.name AS categoryName,
        (SELECT COUNT(id) FROM comments WHERE post_id = p.id) AS commentCount
      FROM posts p
      JOIN users u ON p.user_id = u.id
      JOIN post_categories pc ON p.id = pc.post_id
      JOIN categories c ON pc.category_id = c.id
      WHERE p.is_deleted = false 
        AND c.name = ?
        AND p.created_at >= ?
      ORDER BY p.like_count DESC, p.view_count DESC
      LIMIT 6
    `;

    const popularPosts: PostListDto[] = await AppDataSource.query(query, [category, threeDaysAgo]);

    res.status(200).json({
      success: true,
      data: popularPosts,
    });
  } catch (error) {
    handleError(error, req, res, {
      message: "인기 게시글을 불러오는 중 오류가 발생했습니다.",
      errorCode: "FETCH_POPULAR_POSTS_ERROR",
      additionalContext: { category: req.params.category },
    });
  }
});

//댓글 저장
router.post("/comment", isAuthenticated, async (req: AuthenticatedRequest, res) => {
  try {
    const newComment: CommentCreateData = req.body;
    const userId = req.user?.id;

    const errorMsg = !userId ? "로그인이 필요합니다." : !newComment ? "잘못된 접근입니다." : null;
    if (errorMsg) {
      res.status(400).json({ success: false, message: errorMsg });
      return;
    }

    const comment = new Comment();
    comment.postId = newComment.postId;
    comment.content = newComment.content.trim();
    comment.parentId = newComment.parentId ? newComment.parentId : undefined;
    comment.userId = userId!;
    const savedComment = await AppDataSource.manager.save(comment);

    const responseData: CommentListDto = {
      id: savedComment.id,
      content: savedComment.content,
      likeCount: savedComment.likeCount,
      createdAt: savedComment.createdAt,
      parentId: savedComment.parentId,
      author: {
        id: savedComment.userId,
        nickname: req.user?.nickname,
        profileImageUrl: req.user?.profileImageUrl,
      },
      isLiked: false,
    };

    res.status(201).json({
      success: true,
      data: responseData,
    });
  } catch (error) {
    handleError(error, req, res, {
      message: "댓글을 작성하는 중 오류가 발생했습니다.",
      errorCode: "CREATE_COMMENT_ERROR",
    });
  }
});

router.post("/comment/like", isAuthenticated, async (req: AuthenticatedRequest, res) => {
  try {
    const { commentId, userId } = req.body;
    const comment = await AppDataSource.manager.findOne(Comment, { where: { id: commentId } });
    if (!comment) {
      return res.status(404).json({ success: false, message: "댓글을 찾을 수 없습니다." });
    }

    const existingLike = await AppDataSource.manager.findOne(CommentLike, {
      where: { commentId: commentId, userId: userId },
    });

    let updatedLike = false;
    if (existingLike) {
      comment.likeCount--;
      await AppDataSource.manager.remove(existingLike);
    } else {
      updatedLike = true;
      comment.likeCount++;
      const newLike = new CommentLike();
      newLike.commentId = commentId;
      newLike.userId = userId;
      await AppDataSource.manager.save(newLike);
    }

    await AppDataSource.manager.save(comment);

    return res.status(200).json({
      success: true,
      data: updatedLike,
    });
  } catch (error) {
    handleError(error, req, res, {
      message: "댓글 좋아요 중 오류가 발생했습니다.",
      errorCode: "TOGGLE_COMMENT_LIKE_ERROR",
      additionalContext: { commentId: req.body.commentId },
    });
  }
});

export default router;
