import React from "react";
import BannerSlider from "../components/BannerSlider";
import CommunityRecentPosts from "../components/CommunityRecentPosts";
import RecentOffersList from "../components/RecentOffersList";

const MainPage: React.FC = () => {
  return (
    <div className="w-full">
      <div className="max-w-4xl mx-auto px-4 py-6 mt-16">
        <BannerSlider />
      </div>
      <div className="max-w-4xl mx-auto px-4 pb-4 mb-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <RecentOffersList />
          <CommunityRecentPosts />
        </div>
      </div>
    </div>
  );
};

export default MainPage;
