import { useState, useEffect, useCallback } from "react";
import { IoChevronBack, IoChevronForward } from "react-icons/io5";

interface BannerImage {
  src: string;
  alt: string;
}

const BannerSlider = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const banners: BannerImage[] = [
    // {
    //   src: "/images/banners/test_banner_1.webp",
    //   alt: "배너 1",
    // },
    // {
    //   src: "/images/banners/test_banner_2.jpg",
    //   alt: "배너 2",
    // },
    // {
    //   src: "/images/banners/test_banner_3.webp",
    //   alt: "배너 3",
    // },
    {
      src: "/images/banners/b1.png",
      alt: "배너 1",
    },
    {
      src: "/images/banners/b2.png",
      alt: "배너 2",
    },
    {
      src: "/images/banners/b3.png",
      alt: "배너 3",
    },
  ];

  const nextSlide = useCallback(() => {
    setCurrentIndex((prevIndex) => (prevIndex === banners.length - 1 ? 0 : prevIndex + 1));
  }, [banners.length]);

  const prevSlide = useCallback(() => {
    setCurrentIndex((prevIndex) => (prevIndex === 0 ? banners.length - 1 : prevIndex - 1));
  }, [banners.length]);

  // 자동 슬라이드 (5초마다)
  useEffect(() => {
    if (!isHovered) {
      const interval = setInterval(nextSlide, 5000);
      return () => clearInterval(interval);
    }
  }, [nextSlide, isHovered]);

  return (
    <div
      className="relative w-full h-16 sm:h-24 md:h-32 lg:h-40 overflow-hidden rounded-lg shadow-lg"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 배너 이미지 */}
      <div className="relative w-full h-full">
        {banners.map((banner, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-opacity duration-500 ease-in-out ${
              index === currentIndex ? "opacity-100" : "opacity-0"
            }`}
          >
            <img src={banner.src} alt={banner.alt} className="w-full h-full object-cover" />
            {/* 호버 시에만 어두워지는 오버레이 */}
            <div
              className={`absolute inset-0 bg-black transition-opacity duration-300 ${
                isHovered ? "bg-opacity-20" : "bg-opacity-0"
              }`}
            />
          </div>
        ))}
      </div>

      {/* 네비게이션 버튼들 (hover 시에만 표시) */}
      {isHovered && (
        <>
          <button
            onClick={prevSlide}
            className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-80 hover:bg-opacity-100 text-gray-800 rounded-full p-2 shadow-lg transition-all duration-200 hover:scale-110"
            aria-label="이전 배너"
          >
            <IoChevronBack className="w-6 h-6" />
          </button>
          <button
            onClick={nextSlide}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-80 hover:bg-opacity-100 text-gray-800 rounded-full p-2 shadow-lg transition-all duration-200 hover:scale-110"
            aria-label="다음 배너"
          >
            <IoChevronForward className="w-6 h-6" />
          </button>
        </>
      )}

      {/* 인디케이터 점들 (hover 시에만 표시) */}
      {isHovered && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
          {banners.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`w-2 h-2 rounded-full transition-all duration-200 ${
                index === currentIndex ? "bg-white scale-125" : "bg-white bg-opacity-50 hover:bg-opacity-75"
              }`}
              aria-label={`배너 ${index + 1}로 이동`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default BannerSlider;
