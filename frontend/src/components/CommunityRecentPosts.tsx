import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FiChevronRight } from "react-icons/fi";
import { api } from "../api/axios";
import type { CategoryDto, PostDto } from "../../../shared/types";

// 게시글 타입 정의
interface Post {
  id: PostDto["id"];
  title: PostDto["title"];
  createdAt: PostDto["createdAt"];
}

// 게시판 타입 정의
interface Board {
  board: CategoryDto;
  posts: Post[];
}

const CommunityRecentPosts: React.FC = () => {
  const [boards, setBoards] = useState<Board[]>([]);
  // 데모 데이터 생성

  useEffect(() => {
    const fetchBoardsWithPosts = async () => {
      try {
        const response = await api.get<Board[]>(`/post/recent-posts`);
        setBoards(response);
      } catch (error) {
        console.error("Error fetching boards with posts:", error);
      }
    };
    fetchBoardsWithPosts();
  }, []);

  return (
    <div>
      <div className="bg-white dark:bg-[#292929] rounded-lg shadow-lg p-4 flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">커뮤니티 최근 게시글</h2>
        </div>

        {/* 게시판 리스트 */}
        <div className="space-y-2 flex-1">
          {boards.map((board) => (
            <div
              key={board.board.id}
              className="flex-1 flex flex-col border border-gray-200 dark:border-gray-500 rounded-lg p-3 bg-gray-50 dark:bg-[#1f1f1f]"
            >
              {/* 게시판 제목 - 클릭 가능 */}
              <Link to={`/${board.board.name}`} className="block mb-3 group flex-shrink-0">
                <div className="flex items-center gap-1 group-hover:translate-x-1 transition-all duration-200">
                  <h3 className="text-base font-semibold text-primary-light dark:text-primary-dark group-hover:text-primary-light dark:group-hover:text-primary-dark transition-colors cursor-pointer">
                    {board.board.description}
                  </h3>
                  <FiChevronRight className="text-base text-primary-light dark:text-primary-dark" />
                </div>
              </Link>

              {/* 게시글 리스트 */}
              <div className="space-y-0.5 flex-1 flex flex-col justify-between">
                {board.posts.map((post) => (
                  <Link
                    key={post.id}
                    to={`/post/${post.id}`}
                    className="block text-sm text-gray-700 dark:text-gray-300 hover:underline transition-colors line-clamp-1 py-1 px-2 hover:bg-white dark:hover:bg-[#2a2a2a] rounded"
                  >
                    • {post.title}
                  </Link>
                ))}
                {/* 빈 공간 채우기 */}
                <div className="flex-1"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CommunityRecentPosts;
