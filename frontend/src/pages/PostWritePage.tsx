import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useEditor, EditorContent } from "@tiptap/react";
import { Placeholder } from "@tiptap/extensions";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { TextStyle, FontSize } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import {
  FaBold,
  FaItalic,
  FaUnderline,
  FaStrikethrough,
  FaQuoteLeft,
  FaCode,
  FaAlignLeft,
  FaAlignCenter,
  FaAlignRight,
  FaAlignJustify,
  FaImage,
  FaSave,
  FaTimes,
  FaPalette,
} from "react-icons/fa";
import { MdFormatSize } from "react-icons/md";
import type { PostCreateData } from "../../../shared/types";
import { api } from "../api/axios";
import { useAuthStore } from "../store/authStore";
import { toast } from "sonner";

const PostWritePage: React.FC = () => {
  const { category, postId } = useParams<{ category?: string; postId?: string }>();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [isEditMode, setIsEditMode] = useState(false);
  const [isFontSizeOpen, setIsFontSizeOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuthStore();

  // Tiptap 에디터 설정
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: false,
        orderedList: false,
        listItem: false,
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: "max-w-full h-auto rounded-lg",
        },
      }),
      TextStyle,
      FontSize.configure({
        types: [TextStyle.name],
      }),
      Color.configure({
        types: [TextStyle.name],
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Placeholder.configure({
        placeholder: "내용을 작성하세요",
      }),
      Underline,
    ],
    content: "",
    editorProps: {
      attributes: {
        class:
          "prose prose-lg max-w-none dark:prose-invert focus:outline-none min-h-[400px] p-4 text-gray-900 dark:text-white tiptap",
      },
    },
  });

  // 편집 모드 확인 및 기존 게시글 로드
  useEffect(() => {
    const loadExistingPost = async () => {
      if (postId) {
        try {
          setIsLoading(true);
          setIsEditMode(true);
          const response = await api.get(`/post/detail/${postId}`);
          if (response) {
            // 작성자 체크
            if (response.authorId !== user?.id) {
              toast.error("본인의 게시글만 수정할 수 있습니다.");
              navigate(`/${category}/${postId}`, { replace: true });
              return;
            }
            setTitle(response.title);
            editor?.commands.setContent(response.content);
          }
        } catch (error) {
          console.error("게시글 로드 오류:", error);
          toast.error("게시글을 불러오는 중 오류가 발생했습니다.");
          navigate(`/${category || "post"}`, { replace: true });
        } finally {
          setIsLoading(false);
        }
      }
    };

    loadExistingPost();
  }, [postId, editor, user, category, navigate]);

  // info (tips) 게시판은 관리자만 작성 가능하도록 접근 제어
  useEffect(() => {
    if (category === "tips" && user?.role !== "ADMIN" && !isLoading) {
      toast.error("정보 게시판은 관리자만 작성할 수 있습니다.");
      navigate("/tips", { replace: true });
    }
  }, [category, user, isLoading, navigate]);

  // 페이지 벗어날 때 확인 메시지
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      return "작성 중인 내용이 있습니다. 정말 페이지를 벗어나시겠습니까?";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  // 드롭다운 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isFontSizeOpen) {
        const target = event.target as Element;
        if (!target.closest(".font-size-dropdown")) {
          setIsFontSizeOpen(false);
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isFontSizeOpen]);

  // 이미지 추가 함수
  const addImage = () => {
    const url = window.prompt("이미지 URL을 입력하세요:");
    if (url) {
      editor?.chain().focus().setImage({ src: url }).run();
    }
  };

  // 색상 변경 함수
  const setTextColor = (color: string) => {
    editor?.chain().focus().setColor(color).run();
  };

  // 폰트 크기 변경 함수
  const setFontSize = (size: string) => {
    editor?.chain().focus().setFontSize(size).run();
    setIsFontSizeOpen(false); // 드롭다운 닫기
  };

  // 글 저장 함수
  const handleSave = async () => {
    if (user?.id) {
      if (!title.trim()) {
        alert("제목을 입력해주세요.");
        return;
      }
      if (!editor?.getText().trim()) {
        alert("내용을 입력해주세요.");
        return;
      }

      const content = editor?.getHTML() || "";

      if (isEditMode && postId) {
        // 수정 모드
        const requestBody = {
          title,
          content,
        };
        const response = await api.post(`/post/update/${postId}`, requestBody);
        if (response) {
          toast.success("게시글이 수정되었습니다.");
          navigate(`/${category}/${postId}`);
        } else {
          toast.error("게시글 수정 도중 오류가 발생했습니다.");
        }
      } else {
        // 작성 모드
        const requestBody: PostCreateData = {
          title,
          content,
          userId: user?.id,
        };
        const response = await api.post(`/post/write/${category}`, requestBody);
        if (response) {
          toast.success("게시글이 저장되었습니다.");
          navigate(`/${category}/${response.id}`);
        } else {
          toast.error("게시글 저장 도중 오류가 발생했습니다.");
        }
      }
    } else {
      toast.error("로그인 후 이용해주세요.");
      navigate("/login");
    }
  };

  // 취소 함수
  const handleCancel = () => {
    if (window.confirm("작성 중인 내용이 사라집니다. 정말 취소하시겠습니까?")) {
      if (isEditMode && postId) {
        navigate(`/${category}/${postId}`);
      } else {
        navigate(`/${category || ""}`);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 mt-16">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <p className="text-gray-600 dark:text-gray-400">게시글을 불러오는 중...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Placeholder CSS */}
      <style>
        {`
          .tiptap p.is-editor-empty:first-child::before {
            color: #9ca3af;
            content: attr(data-placeholder);
            float: left;
            height: 0;
            pointer-events: none;
          }
          .dark .tiptap p.is-editor-empty:first-child::before {
            color: #6b7280;
          }
        `}
      </style>
      <div className="max-w-4xl mx-auto px-4 py-8 mt-16">
        {/* 통합 카드 */}
        <div className="bg-white dark:bg-[#292929] rounded-lg shadow-md p-6 mb-6">
          {/* 헤더 */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{isEditMode ? "글 수정" : "글 작성"}</h1>
          </div>

          {/* 제목 입력 */}
          <div className="mb-6">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="제목을 입력하세요"
              className="w-full p-3 border border-gray-300 dark:border-gray-500 rounded-lg bg-white dark:bg-[#292929] text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-light dark:focus:ring-primary-dark focus:border-transparent outline-none text-xl font-semibold"
            />
          </div>

          {/* 에디터 툴바 */}
          <div className="mb-6 border border-gray-300 dark:border-gray-500 rounded-lg p-2">
            <div className="flex flex-wrap items-center gap-0.5 sm:gap-2">
              {/* 텍스트 스타일 */}
              <div className="flex items-center gap-0.5 sm:gap-1 border-r border-gray-300 dark:border-gray-600 pr-1 sm:pr-2">
                <button
                  onClick={() => editor?.chain().focus().toggleBold().run()}
                  className={`p-1 sm:p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                    editor?.isActive("bold") ? "bg-gray-200 dark:bg-gray-600" : ""
                  }`}
                  title="굵게"
                >
                  <FaBold className="w-3 h-3 sm:w-4 sm:h-4 text-gray-700 dark:text-gray-200" />
                </button>
                <button
                  onClick={() => editor?.chain().focus().toggleItalic().run()}
                  className={`p-1 sm:p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                    editor?.isActive("italic") ? "bg-gray-200 dark:bg-gray-600" : ""
                  }`}
                  title="기울임"
                >
                  <FaItalic className="w-3 h-3 sm:w-4 sm:h-4 text-gray-700 dark:text-gray-200" />
                </button>
                <button
                  onClick={() => editor?.chain().focus().toggleUnderline().run()}
                  className={`p-1 sm:p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                    editor?.isActive("underline") ? "bg-gray-200 dark:bg-gray-600" : ""
                  }`}
                  title="밑줄"
                >
                  <FaUnderline className="w-3 h-3 sm:w-4 sm:h-4 text-gray-700 dark:text-gray-200" />
                </button>
                <button
                  onClick={() => editor?.chain().focus().toggleStrike().run()}
                  className={`p-1 sm:p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                    editor?.isActive("strike") ? "bg-gray-200 dark:bg-gray-600" : ""
                  }`}
                  title="취소선"
                >
                  <FaStrikethrough className="w-3 h-3 sm:w-4 sm:h-4 text-gray-700 dark:text-gray-200" />
                </button>
              </div>

              {/* 글자 크기 + 색상 */}
              <div className="flex items-center gap-0.5 sm:gap-1 border-r border-gray-300 dark:border-gray-600 pr-1 sm:pr-2">
                <div className="relative font-size-dropdown">
                  <button
                    onClick={() => setIsFontSizeOpen(!isFontSizeOpen)}
                    className="p-1 sm:p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    title="폰트 크기"
                  >
                    <MdFormatSize className="w-3 h-3 sm:w-4 sm:h-4 text-gray-700 dark:text-gray-200" />
                  </button>
                  {isFontSizeOpen && (
                    <div className="absolute top-full left-0 mt-1 p-2 bg-white dark:bg-[#292929] border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg z-10">
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => setFontSize("12px")}
                          className="px-2 py-1 text-xs sm:text-sm rounded text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
                        >
                          12px
                        </button>
                        <button
                          onClick={() => setFontSize("14px")}
                          className="px-2 py-1 text-xs sm:text-sm rounded text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
                        >
                          14px
                        </button>
                        <button
                          onClick={() => setFontSize("16px")}
                          className="px-2 py-1 text-xs sm:text-sm rounded text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
                        >
                          16px
                        </button>
                        <button
                          onClick={() => setFontSize("18px")}
                          className="px-2 py-1 text-xs sm:text-sm rounded text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
                        >
                          18px
                        </button>
                        <button
                          onClick={() => setFontSize("20px")}
                          className="px-2 py-1 text-xs sm:text-sm rounded text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
                        >
                          20px
                        </button>
                        <button
                          onClick={() => setFontSize("24px")}
                          className="px-2 py-1 text-xs sm:text-sm rounded text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
                        >
                          24px
                        </button>
                        <button
                          onClick={() => setFontSize("28px")}
                          className="px-2 py-1 text-xs sm:text-sm rounded text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
                        >
                          28px
                        </button>
                        <button
                          onClick={() => setFontSize("32px")}
                          className="px-2 py-1 text-xs sm:text-sm rounded text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
                        >
                          32px
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                <div className="relative group">
                  <button
                    className="p-1 sm:p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    title="텍스트 색상"
                  >
                    <FaPalette className="w-3 h-3 sm:w-4 sm:h-4 text-gray-700 dark:text-gray-200" />
                  </button>
                  <div className="absolute top-full left-0 mt-1 p-2 bg-white dark:bg-[#292929] border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                    <div className="flex gap-1">
                      <button
                        onClick={() => setTextColor("#000000")}
                        className="w-5 h-5 sm:w-6 sm:h-6 rounded border border-gray-300 dark:border-gray-600 bg-black hover:scale-110 transition-transform"
                        title="검정색"
                      />
                      <button
                        onClick={() => setTextColor("#ef4444")}
                        className="w-5 h-5 sm:w-6 sm:h-6 rounded border border-gray-300 dark:border-gray-600 bg-red-500 hover:scale-110 transition-transform"
                        title="빨간색"
                      />
                      <button
                        onClick={() => setTextColor("#f97316")}
                        className="w-5 h-5 sm:w-6 sm:h-6 rounded border border-gray-300 dark:border-gray-600 bg-orange-500 hover:scale-110 transition-transform"
                        title="주황색"
                      />
                      <button
                        onClick={() => setTextColor("#eab308")}
                        className="w-5 h-5 sm:w-6 sm:h-6 rounded border border-gray-300 dark:border-gray-600 bg-yellow-500 hover:scale-110 transition-transform"
                        title="노란색"
                      />
                      <button
                        onClick={() => setTextColor("#22c55e")}
                        className="w-5 h-5 sm:w-6 sm:h-6 rounded border border-gray-300 dark:border-gray-600 bg-green-500 hover:scale-110 transition-transform"
                        title="초록색"
                      />
                      <button
                        onClick={() => setTextColor("#3b82f6")}
                        className="w-5 h-5 sm:w-6 sm:h-6 rounded border border-gray-300 dark:border-gray-600 bg-blue-500 hover:scale-110 transition-transform"
                        title="파란색"
                      />
                      <button
                        onClick={() => setTextColor("#8b5cf6")}
                        className="w-5 h-5 sm:w-6 sm:h-6 rounded border border-gray-300 dark:border-gray-600 bg-purple-500 hover:scale-110 transition-transform"
                        title="보라색"
                      />
                      <button
                        onClick={() => setTextColor("#ec4899")}
                        className="w-5 h-5 sm:w-6 sm:h-6 rounded border border-gray-300 dark:border-gray-600 bg-pink-500 hover:scale-110 transition-transform"
                        title="분홍색"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 정렬 */}
              <div className="flex items-center gap-0.5 sm:gap-1 border-r border-gray-300 dark:border-gray-600 pr-1 sm:pr-2">
                <button
                  onClick={() => editor?.chain().focus().setTextAlign("left").run()}
                  className={`p-1 sm:p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                    editor?.isActive({ textAlign: "left" }) ? "bg-gray-200 dark:bg-gray-600" : ""
                  }`}
                  title="좌측 정렬"
                >
                  <FaAlignLeft className="w-3 h-3 sm:w-4 sm:h-4 text-gray-700 dark:text-gray-200" />
                </button>
                <button
                  onClick={() => editor?.chain().focus().setTextAlign("center").run()}
                  className={`p-1 sm:p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                    editor?.isActive({ textAlign: "center" }) ? "bg-gray-200 dark:bg-gray-600" : ""
                  }`}
                  title="중앙 정렬"
                >
                  <FaAlignCenter className="w-3 h-3 sm:w-4 sm:h-4 text-gray-700 dark:text-gray-200" />
                </button>
                <button
                  onClick={() => editor?.chain().focus().setTextAlign("right").run()}
                  className={`p-1 sm:p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                    editor?.isActive({ textAlign: "right" }) ? "bg-gray-200 dark:bg-gray-600" : ""
                  }`}
                  title="우측 정렬"
                >
                  <FaAlignRight className="w-3 h-3 sm:w-4 sm:h-4 text-gray-700 dark:text-gray-200" />
                </button>
                <button
                  onClick={() => editor?.chain().focus().setTextAlign("justify").run()}
                  className={`p-1 sm:p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                    editor?.isActive({ textAlign: "justify" }) ? "bg-gray-200 dark:bg-gray-600" : ""
                  }`}
                  title="양쪽 정렬"
                >
                  <FaAlignJustify className="w-3 h-3 sm:w-4 sm:h-4 text-gray-700 dark:text-gray-200" />
                </button>
              </div>

              {/* 기타 기능 */}
              <div className="flex items-center gap-0.5 sm:gap-1">
                <button
                  onClick={() => editor?.chain().focus().toggleBlockquote().run()}
                  className={`p-1 sm:p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                    editor?.isActive("blockquote") ? "bg-gray-200 dark:bg-gray-600" : ""
                  }`}
                  title="인용구"
                >
                  <FaQuoteLeft className="w-3 h-3 sm:w-4 sm:h-4 text-gray-700 dark:text-gray-200" />
                </button>
                <button
                  onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
                  className={`p-1 sm:p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                    editor?.isActive("codeBlock") ? "bg-gray-200 dark:bg-gray-600" : ""
                  }`}
                  title="코드 블록"
                >
                  <FaCode className="w-3 h-3 sm:w-4 sm:h-4 text-gray-700 dark:text-gray-200" />
                </button>
                <button
                  onClick={addImage}
                  className="p-1 sm:p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  title="이미지 삽입"
                >
                  <FaImage className="w-3 h-3 sm:w-4 sm:h-4 text-gray-700 dark:text-gray-200" />
                </button>
              </div>
            </div>
          </div>

          {/* 에디터 영역 */}
          <div className="border border-gray-300 dark:border-gray-500 rounded-lg p-2">
            <EditorContent editor={editor} />
          </div>
        </div>

        {/* 저장/취소 버튼 */}
        <div className="flex justify-end gap-2">
          <button
            onClick={handleCancel}
            className="px-6 py-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors flex items-center gap-2"
          >
            <FaTimes className="w-4 h-4" />
            취소
          </button>
          <button
            onClick={handleSave}
            className="bg-primary-light dark:bg-primary-dark text-white dark:text-background-dark px-6 py-2 rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2"
          >
            <FaSave className="w-4 h-4" />
            {isEditMode ? "수정" : "저장"}
          </button>
        </div>
      </div>
    </>
  );
};

export default PostWritePage;
