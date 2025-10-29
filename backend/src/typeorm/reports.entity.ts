import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  JoinColumn,
  Unique,
} from "typeorm";
import { User } from "./users.entity";
import {
  REPORTABLE_TYPES,
  REASON_TYPES,
  REPORT_STATUSES,
  type ReportableType,
  type ReasonType,
  type ReportStatus,
} from "../../../shared/constants";

// TypeORM enum을 위한 실제 enum 값들
const ReportableTypeEnum = Object.values(REPORTABLE_TYPES) as [string, ...string[]];
const ReasonTypeEnum = Object.values(REASON_TYPES) as [string, ...string[]];
const ReportStatusEnum = Object.values(REPORT_STATUSES) as [string, ...string[]];

@Entity("reports")
@Unique("uk_reporter_target", ["reporterUserId", "reportableType", "reportableId"])
export class Report {
  @PrimaryGeneratedColumn("increment", { type: "bigint" })
  id: number;

  @Column({ name: "reporter_user_id", type: "bigint", nullable: true })
  @Index("idx_reports_reporter_user_id")
  reporterUserId?: number;

  @Column({
    name: "reportable_type",
    type: "enum",
    enum: ReportableTypeEnum,
    nullable: false,
  })
  reportableType: ReportableType;

  @Column({ name: "reportable_id", type: "bigint", nullable: false })
  @Index("idx_reports_reportable")
  reportableId: number;

  @Column({
    name: "reason_type",
    type: "enum",
    enum: ReasonTypeEnum,
    nullable: false,
  })
  reasonType: ReasonType;

  @Column({ name: "reason_detail", type: "text", nullable: true })
  reasonDetail?: string;

  @Column({
    name: "status",
    type: "enum",
    enum: ReportStatusEnum,
    nullable: false,
    default: REPORT_STATUSES.PENDING,
  })
  @Index("idx_reports_status")
  status: ReportStatus;

  @Column({ name: "admin_id", type: "bigint", nullable: true })
  adminId?: number;

  @Column({ name: "action_taken", type: "text", nullable: true })
  actionTaken?: string;

  @Column({ name: "handled_at", type: "datetime", nullable: true })
  handledAt?: Date;

  @CreateDateColumn({ name: "created_at", type: "datetime" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "datetime" })
  updatedAt: Date;

  @ManyToOne(() => User, { onDelete: "SET NULL" })
  @JoinColumn({ name: "reporter_user_id" })
  reporter?: User;

  @ManyToOne(() => User, { onDelete: "SET NULL" })
  @JoinColumn({ name: "admin_id" })
  admin?: User;
}
