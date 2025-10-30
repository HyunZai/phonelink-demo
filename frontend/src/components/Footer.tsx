import React from "react";
import { Link } from "react-router-dom";

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-background-light dark:bg-background-dark border-t border-gray-200 dark:border-gray-500">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
          <p>© {currentYear} PhoneLink. All rights reserved.</p>
          <div className="flex gap-4">
            <Link to="/terms" className="hover:text-primary-light dark:hover:text-primary-dark transition-colors">
              이용약관
            </Link>
            <Link to="/privacy" className="hover:text-primary-light dark:hover:text-primary-dark transition-colors">
              개인정보처리방침
            </Link>
            <Link to="/help" className="hover:text-primary-light dark:hover:text-primary-dark transition-colors">
              도움말
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
