import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index } from "typeorm";
import { User } from "./users.entity";

@Entity("user_agreements")
@Index("idx_user_agreements_user_id", ["userId"])
export class UserAgreement {
  @PrimaryGeneratedColumn("increment", { type: "bigint" })
  id: number;

  @Column({ name: "user_id", type: "bigint", nullable: false })
  userId: number;

  @Column({
    name: "agree_privacy_use",
    type: "boolean",
    nullable: false,
    default: false,
    comment: "개인정보 수집 및 이용 동의",
  })
  agreePrivacyUse: boolean;

  @Column({
    name: "agree_age_over_14",
    type: "boolean",
    nullable: false,
    default: false,
    comment: "만 14세 이상 확인",
  })
  agreeAgeOver14: boolean;

  @Column({
    name: "agree_terms",
    type: "boolean",
    nullable: false,
    default: false,
    comment: "이용약관 동의",
  })
  agreeTerms: boolean;

  @Column({
    name: "agreed_at",
    type: "datetime",
    nullable: false,
    default: () => "CURRENT_TIMESTAMP",
    comment: "최초 동의 시각",
  })
  agreedAt: Date;

  @Column({
    name: "updated_at",
    type: "datetime",
    nullable: true,
    default: null,
    comment: "수정 시각",
  })
  updatedAt?: Date;

  // --- Relationships ---
  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user: User;
}
