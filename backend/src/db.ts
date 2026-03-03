// import dotenv from "dotenv";
// import { DataSource } from "typeorm";
// import { SqlLogger } from "./utils/SqlLogger";

// dotenv.config();

// export const AppDataSource = new DataSource({
//   type: "mysql",
//   host: process.env.DATABASE_HOST,
//   port: process.env.DATABASE_PORT ? parseInt(process.env.DATABASE_PORT, 10) : undefined,
//   username: process.env.DATABASE_USER,
//   password: process.env.DATABASE_PASSWORD,
//   database: process.env.DATABASE_NAME,
//   entities: [__dirname + "/typeorm/*.entity{.ts,.js}"],
//   logger: new SqlLogger(),
//   logging: true,
//   timezone: "Asia/Seoul", // 한국 시간대 설정
// });

// (async () => {
//   try {
//     await AppDataSource.initialize();
//     console.log("Data source has been initialized!");
//   } catch (err) {
//     console.error("Error during Datasource initialization", err);
//   }
// })();
import dotenv from "dotenv";
import { DataSource } from "typeorm";
import { SqlLogger } from "./utils/SqlLogger";

dotenv.config();

export const AppDataSource = new DataSource({
  type: "mysql",
  host: process.env.DATABASE_HOST,
  port: process.env.DATABASE_PORT ? parseInt(process.env.DATABASE_PORT, 10) : undefined,
  username: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  entities: [__dirname + "/typeorm/*.entity{.ts,.js}"],
  logger: new SqlLogger(),
  logging: true,
  timezone: "Asia/Seoul",
});

const connectWithRetry = async (retries = 10, delay = 3000) => {
  for (let i = 0; i < retries; i++) {
    try {
      await AppDataSource.initialize();
      console.log("Data source has been initialized!");
      return;
    } catch (err) {
      console.error(`DB 연결 실패 (${i + 1}/${retries}), ${delay / 1000}초 후 재시도...`, err);
      await new Promise((res) => setTimeout(res, delay));
    }
  }
  console.error("DB 연결 최종 실패");
  process.exit(1);
};

connectWithRetry();
