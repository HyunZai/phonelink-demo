SET FOREIGN_KEY_CHECKS = 0;

-- --------------------------------------------------------
-- Table: users
-- --------------------------------------------------------
DROP TABLE IF EXISTS users;
CREATE TABLE users (
  id bigint NOT NULL AUTO_INCREMENT,
  email varchar(255) NOT NULL,
  password varchar(255) DEFAULT NULL,
  name varchar(255) NOT NULL,
  nickname varchar(50) DEFAULT NULL,
  profile_image_url varchar(2048) DEFAULT NULL,
  gender enum('M','F') NOT NULL,
  birth_year year DEFAULT NULL,
  birthday varchar(5) DEFAULT NULL,
  age_range varchar(10) DEFAULT NULL,
  phone_number varchar(20) NOT NULL,
  postal_code varchar(10) DEFAULT NULL,
  sido varchar(50) DEFAULT NULL,
  sigungu varchar(50) DEFAULT NULL,
  address varchar(255) DEFAULT NULL,
  address_detail varchar(255) DEFAULT NULL,
  role enum('USER','SELLER','ADMIN') NOT NULL DEFAULT 'USER',
  status enum('ACTIVE','SUSPENDED','WITHDRAWN') NOT NULL DEFAULT 'ACTIVE',
  last_login_at datetime DEFAULT NULL,
  last_login_type varchar(100) NOT NULL,
  deleted_at datetime DEFAULT NULL,
  created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_email (email),
  UNIQUE KEY uk_nickname (nickname),
  UNIQUE KEY uk_phone_number (phone_number),
  KEY idx_status (status),
  KEY idx_deleted_at (deleted_at)
);

-- --------------------------------------------------------
-- Table: social_accounts
-- --------------------------------------------------------
DROP TABLE IF EXISTS social_accounts;
CREATE TABLE social_accounts (
  id bigint NOT NULL AUTO_INCREMENT,
  user_id bigint NOT NULL,
  provider varchar(20) NOT NULL,
  provider_user_id varchar(255) NOT NULL,
  access_token varchar(1024) DEFAULT NULL,
  refresh_token varchar(1024) DEFAULT NULL,
  created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_provider_user (provider, provider_user_id),
  KEY idx_user_id (user_id),
  CONSTRAINT fk_social_accounts_user FOREIGN KEY (user_id) REFERENCES users (id)
);

-- --------------------------------------------------------
-- Table: user_agreements
-- --------------------------------------------------------
DROP TABLE IF EXISTS user_agreements;
CREATE TABLE user_agreements (
  id bigint NOT NULL AUTO_INCREMENT,
  user_id bigint NOT NULL,
  agree_privacy_use tinyint(1) NOT NULL DEFAULT '0' COMMENT '개인정보 수집 및 이용 동의',
  agree_age_over_14 tinyint(1) NOT NULL DEFAULT '0' COMMENT '만 14세 이상 확인',
  agree_terms tinyint(1) NOT NULL DEFAULT '0' COMMENT '이용약관 동의',
  agreed_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '최초 동의 시각',
  updated_at datetime DEFAULT NULL COMMENT '수정 시각',
  PRIMARY KEY (id),
  KEY idx_user_agreements_user_id (user_id),
  CONSTRAINT fk_user_agreements_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- --------------------------------------------------------
-- Table: carriers
-- --------------------------------------------------------
DROP TABLE IF EXISTS carriers;
CREATE TABLE carriers (
  id int NOT NULL AUTO_INCREMENT,
  name varchar(50) NOT NULL,
  image_url varchar(2048) DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_name (name)
);

-- --------------------------------------------------------
-- Table: phone_manufacturers
-- --------------------------------------------------------
DROP TABLE IF EXISTS phone_manufacturers;
CREATE TABLE phone_manufacturers (
  id int NOT NULL AUTO_INCREMENT,
  name_ko varchar(50) NOT NULL,
  name_en varchar(50) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_name_ko (name_ko),
  UNIQUE KEY uk_name_en (name_en)
);

-- --------------------------------------------------------
-- Table: phone_models
-- --------------------------------------------------------
DROP TABLE IF EXISTS phone_models;
CREATE TABLE phone_models (
  id bigint NOT NULL AUTO_INCREMENT,
  manufacturer_id int NOT NULL,
  name_ko varchar(100) NOT NULL,
  name_en varchar(100) NOT NULL,
  image_url varchar(2048) DEFAULT NULL,
  release_date date DEFAULT NULL,
  created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_name_ko_manufacturer (name_ko, manufacturer_id),
  UNIQUE KEY uk_name_en_manufacturer (name_en, manufacturer_id),
  KEY idx_manufacturer_id (manufacturer_id),
  CONSTRAINT fk_phone_models_manufacturer FOREIGN KEY (manufacturer_id) REFERENCES phone_manufacturers (id)
);

-- --------------------------------------------------------
-- Table: phone_storages
-- --------------------------------------------------------
DROP TABLE IF EXISTS phone_storages;
CREATE TABLE phone_storages (
  id int NOT NULL AUTO_INCREMENT,
  storage varchar(10) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_storage (storage)
);

-- --------------------------------------------------------
-- Table: phone_devices
-- --------------------------------------------------------
DROP TABLE IF EXISTS phone_devices;
CREATE TABLE phone_devices (
  id bigint NOT NULL AUTO_INCREMENT,
  model_id bigint NOT NULL,
  storage_id int NOT NULL,
  retail_price int NOT NULL,
  unlocked_price int DEFAULT NULL,
  coupang_link text,
  created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_model_storage (model_id, storage_id),
  KEY idx_model_id (model_id),
  KEY idx_storage_id (storage_id),
  CONSTRAINT fk_phone_devices_model FOREIGN KEY (model_id) REFERENCES phone_models (id),
  CONSTRAINT fk_phone_devices_storage FOREIGN KEY (storage_id) REFERENCES phone_storages (id)
);

-- --------------------------------------------------------
-- Table: regions
-- --------------------------------------------------------
DROP TABLE IF EXISTS regions;
CREATE TABLE regions (
  code varchar(10) NOT NULL,
  name varchar(100) NOT NULL,
  is_active tinyint(1) NOT NULL DEFAULT '1',
  latitude decimal(10,7) DEFAULT NULL,
  longitude decimal(10,7) DEFAULT NULL,
  last_synced_at datetime DEFAULT NULL,
  created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (code)
);

-- --------------------------------------------------------
-- Table: stores
-- --------------------------------------------------------
DROP TABLE IF EXISTS stores;
CREATE TABLE stores (
  id bigint NOT NULL AUTO_INCREMENT,
  name varchar(255) NOT NULL,
  description text,
  region_code varchar(10) NOT NULL,
  address varchar(255) DEFAULT NULL,
  address_detail varchar(255) DEFAULT NULL,
  latitude decimal(10,7) DEFAULT NULL,
  longitude decimal(10,7) DEFAULT NULL,
  contact varchar(20) DEFAULT NULL,
  thumbnail_url varchar(2048) DEFAULT NULL,
  link_1 varchar(2048) DEFAULT NULL,
  link_2 varchar(2048) DEFAULT NULL,
  owner_name varchar(50) DEFAULT NULL,
  is_featured tinyint(1) NOT NULL DEFAULT '0',
  status enum('OPEN','CLOSED') NOT NULL DEFAULT 'OPEN',
  approval_status enum('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING',
  created_by bigint DEFAULT NULL,
  updated_by bigint DEFAULT NULL,
  created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_region_code (region_code),
  CONSTRAINT fk_stores_region FOREIGN KEY (region_code) REFERENCES regions (code),
  CONSTRAINT fk_stores_created_by FOREIGN KEY (created_by) REFERENCES users (id),
  CONSTRAINT fk_stores_updated_by FOREIGN KEY (updated_by) REFERENCES users (id)
);

-- --------------------------------------------------------
-- Table: sellers
-- --------------------------------------------------------
DROP TABLE IF EXISTS sellers;
CREATE TABLE sellers (
  id bigint NOT NULL AUTO_INCREMENT,
  user_id bigint NOT NULL,
  store_id bigint NOT NULL,
  status enum('ACTIVE','INACTIVE','PENDING','REJECTED') NOT NULL DEFAULT 'PENDING' COMMENT 'ACTIVE: 재직, INACTIVE: 퇴사, PENDING: 승인대기, REJECTED: 승인거절',
  created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_user_store (user_id, store_id),
  KEY idx_user_id (user_id),
  KEY idx_store_id (store_id),
  CONSTRAINT fk_sellers_user FOREIGN KEY (user_id) REFERENCES users (id),
  CONSTRAINT fk_sellers_store FOREIGN KEY (store_id) REFERENCES stores (id)
);

-- --------------------------------------------------------
-- Table: addons
-- --------------------------------------------------------
DROP TABLE IF EXISTS addons;
CREATE TABLE addons (
  id bigint NOT NULL AUTO_INCREMENT,
  store_id bigint NOT NULL,
  carrier_id int NOT NULL,
  name varchar(100) NOT NULL,
  monthly_fee int NOT NULL,
  duration_months int NOT NULL,
  penalty_fee int NOT NULL,
  created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_store_id (store_id),
  KEY idx_carrier_id (carrier_id),
  CONSTRAINT fk_addons_store FOREIGN KEY (store_id) REFERENCES stores (id),
  CONSTRAINT fk_addons_carrier FOREIGN KEY (carrier_id) REFERENCES carriers (id)
);

-- --------------------------------------------------------
-- Table: req_plans
-- --------------------------------------------------------
DROP TABLE IF EXISTS req_plans;
CREATE TABLE req_plans (
  id bigint NOT NULL AUTO_INCREMENT,
  store_id bigint NOT NULL,
  carrier_id int NOT NULL,
  name varchar(255) NOT NULL,
  monthly_fee int NOT NULL,
  duration int NOT NULL,
  PRIMARY KEY (id),
  KEY idx_store_id (store_id),
  KEY idx_carrier_id (carrier_id),
  CONSTRAINT fk_req_plans_store FOREIGN KEY (store_id) REFERENCES stores (id),
  CONSTRAINT fk_req_plans_carrier FOREIGN KEY (carrier_id) REFERENCES carriers (id)
);

-- --------------------------------------------------------
-- Table: offers
-- --------------------------------------------------------
DROP TABLE IF EXISTS offers;
CREATE TABLE offers (
  id bigint NOT NULL AUTO_INCREMENT,
  store_id bigint NOT NULL,
  carrier_id int NOT NULL,
  device_id bigint NOT NULL,
  offer_type enum('MNP','CHG') NOT NULL,
  price int DEFAULT NULL,
  sort_order int NOT NULL DEFAULT '0',
  updated_by bigint DEFAULT NULL,
  created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_store_id (store_id),
  KEY idx_carrier_id (carrier_id),
  KEY idx_device_id (device_id),
  CONSTRAINT fk_offers_store FOREIGN KEY (store_id) REFERENCES stores (id),
  CONSTRAINT fk_offers_carrier FOREIGN KEY (carrier_id) REFERENCES carriers (id),
  CONSTRAINT fk_offers_device FOREIGN KEY (device_id) REFERENCES phone_devices (id),
  CONSTRAINT fk_offers_updated_by FOREIGN KEY (updated_by) REFERENCES users (id)
);

-- --------------------------------------------------------
-- Table: posts
-- --------------------------------------------------------
DROP TABLE IF EXISTS posts;
CREATE TABLE posts (
  id bigint NOT NULL AUTO_INCREMENT,
  user_id bigint NOT NULL,
  title varchar(255) NOT NULL,
  thumbnail_url varchar(2048) DEFAULT NULL,
  content text NOT NULL,
  view_count int NOT NULL DEFAULT '0',
  like_count int NOT NULL DEFAULT '0',
  is_deleted tinyint(1) NOT NULL DEFAULT '0',
  created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_posts_user_id (user_id),
  KEY idx_posts_created_at (created_at),
  CONSTRAINT fk_posts_user FOREIGN KEY (user_id) REFERENCES users (id)
);

-- --------------------------------------------------------
-- Table: post_images
-- --------------------------------------------------------
DROP TABLE IF EXISTS post_images;
CREATE TABLE post_images (
  id bigint NOT NULL AUTO_INCREMENT,
  post_id bigint NOT NULL,
  image_url text NOT NULL,
  uploaded_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_post_id (post_id),
  CONSTRAINT fk_post_images_post FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE
);

-- --------------------------------------------------------
-- Table: post_files
-- --------------------------------------------------------
DROP TABLE IF EXISTS post_files;
CREATE TABLE post_files (
  id bigint NOT NULL AUTO_INCREMENT,
  post_id bigint NOT NULL,
  file_name varchar(255) NOT NULL,
  file_url text NOT NULL,
  file_size int NOT NULL,
  uploaded_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_post_id (post_id),
  CONSTRAINT fk_post_files_post FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE
);

-- --------------------------------------------------------
-- Table: post_likes
-- --------------------------------------------------------
DROP TABLE IF EXISTS post_likes;
CREATE TABLE post_likes (
  user_id bigint NOT NULL,
  post_id bigint NOT NULL,
  created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, post_id),
  KEY idx_post_id (post_id),
  CONSTRAINT fk_post_likes_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_post_likes_post FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE
);

-- --------------------------------------------------------
-- Table: categories
-- --------------------------------------------------------
DROP TABLE IF EXISTS categories;
CREATE TABLE categories (
  id bigint NOT NULL AUTO_INCREMENT,
  name varchar(100) NOT NULL,
  description text,
  PRIMARY KEY (id),
  UNIQUE KEY uk_name (name)
);

-- --------------------------------------------------------
-- Table: post_categories
-- --------------------------------------------------------
DROP TABLE IF EXISTS post_categories;
CREATE TABLE post_categories (
  post_id bigint NOT NULL,
  category_id bigint NOT NULL,
  PRIMARY KEY (post_id, category_id),
  KEY idx_pc_category_id_post_id (category_id, post_id),
  CONSTRAINT fk_post_categories_post FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE,
  CONSTRAINT fk_post_categories_category FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE CASCADE
);

-- --------------------------------------------------------
-- Table: comments
-- --------------------------------------------------------
DROP TABLE IF EXISTS comments;
CREATE TABLE comments (
  id bigint NOT NULL AUTO_INCREMENT,
  post_id bigint NOT NULL,
  user_id bigint NOT NULL,
  parent_id bigint DEFAULT NULL,
  content text NOT NULL,
  like_count int NOT NULL DEFAULT '0',
  is_deleted tinyint(1) NOT NULL DEFAULT '0',
  created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_post_id (post_id),
  KEY idx_user_id (user_id),
  KEY idx_parent_id (parent_id),
  CONSTRAINT fk_comments_post FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE,
  CONSTRAINT fk_comments_user FOREIGN KEY (user_id) REFERENCES users (id),
  CONSTRAINT fk_comments_parent FOREIGN KEY (parent_id) REFERENCES comments (id) ON DELETE CASCADE
);

-- --------------------------------------------------------
-- Table: comment_likes
-- --------------------------------------------------------
DROP TABLE IF EXISTS comment_likes;
CREATE TABLE comment_likes (
  user_id bigint NOT NULL,
  comment_id bigint NOT NULL,
  created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, comment_id),
  KEY idx_comment_id (comment_id),
  CONSTRAINT fk_comment_likes_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_comment_likes_comment FOREIGN KEY (comment_id) REFERENCES comments (id) ON DELETE CASCADE
);

-- --------------------------------------------------------
-- Table: reports
-- --------------------------------------------------------
DROP TABLE IF EXISTS reports;
CREATE TABLE reports (
  id bigint NOT NULL AUTO_INCREMENT,
  reporter_user_id bigint DEFAULT NULL,
  reportable_type enum('POST','COMMENT','USER','STORE') NOT NULL,
  reportable_id bigint NOT NULL,
  reason_type enum('SPAM','ABUSE','OBSCENITY','ILLEGAL','PRIVACY','COPYRIGHT','OTHER') NOT NULL,
  reason_detail text,
  status enum('PENDING','PROCESSING','RESOLVED','DISMISSED') NOT NULL DEFAULT 'PENDING',
  admin_id bigint DEFAULT NULL,
  action_taken text,
  handled_at datetime DEFAULT NULL,
  created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_reporter_target (reporter_user_id, reportable_type, reportable_id),
  KEY idx_reports_reporter_user_id (reporter_user_id),
  KEY idx_reports_reportable (reportable_id),
  KEY idx_reports_status (status),
  CONSTRAINT fk_reports_reporter FOREIGN KEY (reporter_user_id) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT fk_reports_admin FOREIGN KEY (admin_id) REFERENCES users (id) ON DELETE SET NULL
);

-- --------------------------------------------------------
-- Table: user_favorites
-- --------------------------------------------------------
DROP TABLE IF EXISTS user_favorites;
CREATE TABLE user_favorites (
  id bigint NOT NULL AUTO_INCREMENT,
  user_id bigint NOT NULL,
  store_id bigint NOT NULL,
  created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_user_store (user_id, store_id),
  KEY idx_user_favorites_user_id (user_id),
  KEY idx_user_favorites_store_id (store_id),
  CONSTRAINT fk_user_favorites_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_user_favorites_store FOREIGN KEY (store_id) REFERENCES stores (id) ON DELETE CASCADE
);

-- --------------------------------------------------------
-- Table: user_suspensions
-- --------------------------------------------------------
DROP TABLE IF EXISTS user_suspensions;
CREATE TABLE user_suspensions (
  id bigint NOT NULL AUTO_INCREMENT,
  user_id bigint NOT NULL,
  reason text,
  suspended_until datetime NOT NULL,
  suspended_by bigint DEFAULT NULL,
  created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  unsuspended_at datetime DEFAULT NULL,
  PRIMARY KEY (id),
  KEY idx_user_id (user_id),
  KEY idx_suspended_until (suspended_until),
  CONSTRAINT fk_user_suspensions_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_user_suspensions_admin FOREIGN KEY (suspended_by) REFERENCES users (id)
);

SET FOREIGN_KEY_CHECKS = 1;
