import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { IoCheckmarkCircle, IoCheckmarkCircleOutline } from "react-icons/io5";
import type { AgreementState } from "../../../shared/user_v2.types";
import { useSignupStore } from "../store/signupStore";

const AgreementPage: React.FC = () => {
  const navigate = useNavigate();
  const { agreements, setAgreement } = useSignupStore();

  type AgreementKey = keyof AgreementState;
  const agreementKeys: AgreementKey[] = ["agreeAgeOver14", "agreePrivacyUse", "agreeTerms"];
  const allChecked = agreements.agreePrivacyUse && agreements.agreeAgeOver14 && agreements.agreeTerms;

  //해당 페이지 진입 시, 동의 데이터 초기화
  useEffect(() => {
    agreementKeys.forEach((key) => setAgreement(key, false));
  }, []);

  const handleAllAgree = () => {
    const newValue = !allChecked;
    agreementKeys.forEach((key) => setAgreement(key, newValue));
  };

  const handleIndividualAgree = (field: AgreementKey) => {
    setAgreement(field, !agreements[field]);
  };

  const handleNext = () => {
    if (!allChecked) {
      return;
    }

    // 회원가입 페이지로 이동
    // SSO 회원가입인 경우 signupToken과 ssoData는 이미 sessionStorage에 저장되어 있음
    navigate("/signup");
  };

  const agreementItems: Array<{
    id: AgreementKey;
    label: string;
    required: boolean;
    content: string;
  }> = [
    {
      id: "agreeAgeOver14",
      label: "만 14세 이상 확인",
      required: true,
      content: `PhoneLink는 만 14세 미만 아동은 가입할 수 없습니다.`,
    },
    {
      id: "agreePrivacyUse",
      label: "개인정보 수집 및 이용 동의",
      required: true,
      content: `PhoneLink(이하 "운영자")는 개인정보보호법에 따라 이용자의 개인정보 보호 및 권익을 보호하고자 다음과 같이 개인정보처리방침을 수립·공개합니다.

【수집하는 개인정보의 항목 및 수집 방법】
1. 필수 항목: 이메일, 이름, 전화번호
2. 선택 항목: 생년월일, 성별, 주소(시/도, 시/군/구, 상세주소)
3. 수집 방법: 회원가입 시 직접 입력

【개인정보의 수집 및 이용 목적】
1. 회원 관리: 회원제 서비스 제공에 따른 본인확인, 개인 식별, 부정 이용 방지, 불만처리 및 민원처리, 고지사항 전달
2. 서비스 제공: 스마트폰 견적 비교 서비스 제공, 콘텐츠 제공, 본인 인증
3. 기타: 법령 및 이용약관을 위반하는 회원에 대한 이용 제한 조치 등에 사용

【개인정보의 보유 및 이용 기간】
이용자의 개인정보는 원칙적으로 개인정보의 수집 및 이용 목적이 달성되면 지체 없이 파기합니다. 단, 다음의 정보에 대해서는 아래의 이유로 명시한 기간 동안 보관합니다.
1. 회원 정보: 회원 탈퇴 시까지 보관
2. 법령에 의한 보존 의무가 있는 경우: 해당 법령에서 정한 기간 동안 보관
   - 전자상거래 등에서의 소비자보호에 관한 법률: 계약 또는 청약철회 등에 관한 기록(5년), 대금결제 및 재화 등의 공급에 관한 기록(5년), 소비자의 불만 또는 분쟁처리에 관한 기록(3년)
   - 통신비밀보호법: 웹사이트 방문기록(3개월)
   - 정보통신망 이용촉진 및 정보보호 등에 관한 법률: 본인확인에 관한 기록(6개월)

【개인정보의 제3자 제공】
운영자는 이용자의 개인정보를 원칙적으로 외부에 제공하지 않습니다. 다만, 아래의 경우에는 예외로 합니다.
1. 이용자들이 사전에 동의한 경우
2. 법령의 규정에 의거하거나, 수사 목적으로 법령에 정해진 절차와 방법에 따라 수사기관의 요구가 있는 경우

【개인정보 처리의 위탁】
운영자는 현재 개인정보 처리 위탁을 하지 않습니다. 향후 위탁이 필요한 경우, 위탁받는 자와 위탁하는 업무의 내용에 대해 사전에 공지하고 필요한 경우 사전 동의를 받겠습니다.

【이용자의 권리·의무 및 그 행사 방법】
이용자는 언제든지 개인정보 열람·정정·삭제·처리정지 요구 등의 권리를 행사할 수 있으며, 운영자는 이에 대해 지체 없이 조치하겠습니다. 다만, 다음의 경우에는 예외로 합니다.
1. 법률에 특별한 규정이 있거나 법령상 의무를 준수하기 위하여 불가피한 경우
2. 다른 사람의 생명·신체를 해할 우려가 있거나 다른 사람의 재산과 그 밖의 이익을 부당하게 침해할 우려가 있는 경우

【개인정보의 파기】
운영자는 개인정보 보유기간의 경과, 처리목적 달성 등 개인정보가 불필요하게 되었을 때에는 지체 없이 해당 개인정보를 파기합니다.
- 파기 방법: 전자적 파일 형태인 경우 복구 및 재생되지 않도록 안전하게 삭제하며, 기록물, 인쇄물, 서면 등은 분쇄하거나 소각하여 파기합니다.

【개인정보 보호책임자】
운영자는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한 정보주체의 불만처리 및 피해구제 등을 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.
- 개인정보 보호책임자: (추후 지정)
- 연락처: (추후 지정)

【개인정보의 안전성 확보 조치】
운영자는 개인정보의 안전성 확보를 위해 다음과 같은 조치를 취하고 있습니다.
1. 관리적 조치: 내부관리계획 수립·시행, 정기적 직원 교육 등
2. 기술적 조치: 개인정보처리시스템 등의 접근권한 관리, 접근통제시스템 설치, 고유식별정보 등의 암호화, 보안프로그램 설치
3. 물리적 조치: 전산실, 자료보관실 등의 접근통제

【정보주체의 권익 침해에 대한 구제 방법】
정보주체는 아래의 기관에 개인정보 침해에 대한 신고나 상담을 할 수 있습니다.
- 개인정보 침해신고센터 (privacy.go.kr / 국번 없이 182)
- 개인정보 분쟁조정위원회 (www.kopico.go.kr / 1833-6972)
- 대검찰청 사이버범죄수사단 (www.spo.go.kr / 02-3480-3573)
- 경찰청 사이버테러대응센터 (www.netan.go.kr / 국번 없이 182)

【동의 거부 권리 및 불이익】
이용자는 개인정보 수집·이용에 대한 동의를 거부할 권리가 있습니다. 다만, 동의를 거부할 경우 회원가입 및 서비스 이용이 제한됩니다.`,
    },
    {
      id: "agreeTerms",
      label: "이용약관 동의",
      required: true,
      content: `PhoneLink 이용약관에 동의합니다.

제1조 (목적)
이 약관은 PhoneLink(이하 "운영자" 또는 "사이트")가 제공하는 온라인 서비스(이하 "서비스")의 이용과 관련하여 운영자와 이용자 간의 권리, 의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.

제2조 (정의)
① "서비스"란 운영자가 제공하는 스마트폰 견적 비교, 매장 정보 제공, 커뮤니티 서비스 등 모든 온라인 서비스를 의미합니다.
② "이용자"란 이 약관에 따라 운영자가 제공하는 서비스를 받는 회원 및 비회원을 말합니다.
③ "회원"이란 운영자에 개인정보를 제공하여 회원등록을 한 자로서, 운영자의 정보를 지속적으로 제공받으며, 운영자가 제공하는 서비스를 계속적으로 이용할 수 있는 자를 말합니다.
④ "비회원"이란 회원에 가입하지 않고 운영자가 제공하는 서비스를 이용하는 자를 말합니다.

제3조 (약관의 게시와 개정)
① 운영자는 이 약관의 내용을 이용자가 쉽게 알 수 있도록 서비스 초기 화면(전면)에 게시합니다.
② 운영자는 필요한 경우 관련 법령을 위배하지 않는 범위에서 이 약관을 개정할 수 있습니다.
③ 운영자가 약관을 개정할 경우에는 적용일자 및 개정사유를 명시하여 현행약관과 함께 서비스의 초기 화면에 그 적용일자 7일 이전부터 적용일자 전일까지 공지합니다. 다만, 이용자에게 불리하게 약관 내용을 변경하는 경우에는 최소한 30일 이상의 사전 유예기간을 두고 공지합니다.
④ 회원은 변경된 약관에 동의하지 않을 권리가 있으며, 동의하지 않을 경우에는 서비스 이용을 중단하고 탈퇴할 수 있습니다.

제4조 (서비스의 제공 및 변경)
① 운영자는 다음과 같은 서비스를 제공합니다:
  1. 스마트폰 견적 비교 서비스
  2. 매장 정보 제공 서비스
  3. 커뮤니티 서비스(게시판, 댓글 등)
  4. 기타 운영자가 추가 개발하거나 제휴계약 등을 통해 회원에게 제공하는 일체의 서비스
② 운영자는 필요한 경우 서비스의 내용을 추가 또는 변경할 수 있습니다. 다만, 이 경우에는 추가 또는 변경내용을 즉시 공지합니다.

제5조 (서비스의 중단)
① 운영자는 컴퓨터 등 정보통신설비의 보수점검·교체 및 고장, 통신의 두절 등의 사유가 발생한 경우에는 서비스의 제공을 일시적으로 중단할 수 있습니다.
② 운영자는 제1항의 사유로 서비스의 제공이 일시적으로 중단됨으로 인하여 이용자 또는 제3자가 입은 손해에 대하여 배상합니다. 단, 운영자가 고의 또는 과실이 없음을 입증하는 경우에는 그러하지 아니합니다.

제6조 (회원가입)
① 이용자는 운영자가 정한 가입 양식에 따라 회원정보를 기입한 후 이 약관에 동의한다는 의사표시를 함으로서 회원가입을 신청합니다.
② 운영자는 제1항과 같이 회원가입을 신청한 이용자 중 다음 각 호에 해당하지 않는 한 회원으로 등록합니다:
  1. 가입신청자가 이 약관에 의하여 이전에 회원자격을 상실한 적이 있는 경우
  2. 등록 내용에 허위, 기재누락, 오기가 있는 경우
  3. 기타 회원으로 등록하는 것이 운영자의 기술상 현저히 지장이 있다고 판단되는 경우
③ 회원가입계약의 성립 시기는 운영자의 승낙이 회원에게 도달한 시점으로 합니다.

제7조 (회원 탈퇴 및 자격 상실)
① 회원은 운영자에 언제든지 탈퇴를 요청할 수 있으며 운영자는 즉시 회원탈퇴를 처리합니다.
② 회원이 다음 각 호의 사유에 해당하는 경우, 운영자는 회원자격을 제한 및 정지시킬 수 있습니다:
  1. 가입 신청 시에 허위 내용을 등록한 경우
  2. 다른 사람의 서비스 이용을 방해하거나 그 정보를 도용하는 등 전자상거래 질서를 위협하는 경우
  3. 서비스를 이용하여 법령 또는 이 약관이 금지하거나 공서양속에 반하는 행위를 하는 경우
③ 운영자가 회원 자격을 제한·정지시킨 후, 동일한 행위가 2회 이상 반복되거나 30일 이내에 그 사유가 시정되지 아니하는 경우 운영자는 회원자격을 상실시킬 수 있습니다.

제8조 (회원에 대한 통지)
① 운영자가 회원에 대한 통지를 하는 경우, 회원이 운영자에 제출한 전자우편 주소로 할 수 있습니다.
② 운영자는 불특정다수 회원에 대한 통지의 경우 1주일 이상 운영자의 게시판에 게시함으로서 개별 통지에 갈음할 수 있습니다.

제9조 (개인정보보호)
① 운영자는 이용자의 개인정보 수집 시 서비스 제공을 위하여 필요한 범위에서 최소한의 개인정보를 수집합니다.
② 운영자는 회원가입 시 서비스 제공에 필요한 최소한의 정보만을 수집하며, 회원은 개인정보의 보호 및 관리에 대한 개별 동의를 해야 합니다.
③ 운영자는 이용자로부터 수집한 개인정보를 목적 외의 용도로 이용하거나 제3자에게 제공하지 않으며, 관련 법령에 따라 관리·보호합니다.
④ 운영자의 개인정보보호책임자 및 연락처는 개인정보처리방침에서 확인하실 수 있습니다.

제10조 (운영자의 의무)
① 운영자는 법령과 이 약관이 금지하거나 공서양속에 반하는 행위를 하지 않으며, 지속적이고 안정적으로 서비스를 제공하는데 최선을 다합니다.
② 운영자는 이용자가 안전하게 서비스를 이용할 수 있도록 개인정보(신용정보 포함) 보호를 위한 보안시스템을 갖추며, 개인정보처리방침을 공시하고 준수합니다.
③ 운영자는 서비스와 관련하여 이용자로부터 제기된 의견이나 불만이 정당하다고 인정할 경우에는 이를 처리하여야 합니다.

제11조 (회원의 의무)
① 회원은 다음 행위를 하여서는 안 됩니다:
  1. 신청 또는 변경 시 허위내용의 등록
  2. 타인의 정보 도용
  3. 운영자가 게시한 정보의 변경
  4. 운영자가 정한 정보 이외의 정보(컴퓨터 프로그램 등) 등의 송신 또는 게시
  5. 운영자와 기타 제3자의 저작권 등 지적재산권에 대한 침해
  6. 운영자 및 기타 제3자의 명예를 손상시키거나 업무를 방해하는 행위
  7. 외설 또는 폭력적인 메시지, 화상, 음성, 기타 공서양속에 반하는 정보를 공개 또는 게시하는 행위
  8. 기타 불법적이거나 부당한 행위
② 회원은 관계법령, 이 약관의 규정, 이용안내 및 서비스와 관련하여 공지한 주의사항, 운영자가 통지하는 사항 등을 준수하여야 하며, 기타 운영자의 업무에 방해되는 행위를 하여서는 안 됩니다.

제12조 (저작권의 귀속 및 이용제한)
① 운영자가 작성한 저작물에 대한 저작권 및 기타 지적재산권은 운영자에 귀속합니다.
② 이용자는 운영자를 이용함으로써 얻은 정보를 운영자의 사전 승낙 없이 복제, 송신, 출판, 배포, 방송 기타 방법에 의하여 영리목적으로 이용하거나 제3자에게 이용하게 하여서는 안 됩니다.

제13조 (분쟁해결)
① 운영자는 이용자가 제기하는 정당한 의견이나 불만을 반영하고 그 피해를 보상처리하기 위하여 피해보상처리기구를 설치·운영합니다.
② 운영자와 이용자 간에 발생한 전자상거래 분쟁에 관한 소송은 제소 당시의 이용자의 주소에 의하고, 주소가 없는 경우에는 거소를 관할하는 지방법원의 전속관할로 합니다. 다만, 제소 당시 이용자의 주소 또는 거소가 명확하지 아니한 경우의 관할법원은 민사소송법에 따라 정합니다.
③ 운영자와 이용자 간에 발생한 분쟁은 한국법을 적용합니다.

제14조 (면책사항)
① 운영자는 천재지변 또는 이에 준하는 불가항력으로 인하여 서비스를 제공할 수 없는 경우에는 서비스 제공에 관한 책임이 면제됩니다.
② 운영자는 회원의 귀책사유로 인한 서비스 이용의 장애에 대하여는 책임을 지지 않습니다.
③ 운영자는 회원이 서비스를 이용하여 기대하는 수익을 상실한 것에 대하여 책임을 지지 않으며, 그 밖의 서비스를 통하여 얻은 자료로 인한 손해에 관하여 책임을 지지 않습니다.

이 약관은 2025년 11월 1일부터 적용됩니다.`,
    },
  ];

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark py-8 px-4 sm:py-12 sm:px-6 lg:py-16 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-primary-light dark:text-primary-dark mb-4">
            PhoneLink
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-400">
            회원가입을 위해 아래 약관에 동의해주세요
          </p>
        </div>

        {/* Agreement Container */}
        <div className="bg-white dark:bg-[#292929] rounded-lg shadow-md p-4 sm:p-6 lg:p-8 space-y-6">
          {/* 전체 동의 */}
          <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
            <button
              type="button"
              onClick={handleAllAgree}
              className="flex items-center w-full text-left hover:opacity-80 transition-opacity"
            >
              <div className="flex-shrink-0 mr-3">
                {allChecked ? (
                  <IoCheckmarkCircle className="w-6 h-6 sm:w-7 sm:h-7 text-primary-light dark:text-primary-dark" />
                ) : (
                  <IoCheckmarkCircleOutline className="w-6 h-6 sm:w-7 sm:h-7 text-gray-400 dark:text-gray-500" />
                )}
              </div>
              <span className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100">전체 동의</span>
            </button>
          </div>

          {/* 개별 동의 항목 */}
          <div className="space-y-4 sm:space-y-6">
            {agreementItems.map((item) => (
              <div key={item.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 sm:p-6">
                <div className="flex items-start mb-3 sm:mb-4">
                  <button
                    type="button"
                    onClick={() => handleIndividualAgree(item.id)}
                    className="flex-shrink-0 mr-3 mt-0.5"
                  >
                    {agreements[item.id] ? (
                      <IoCheckmarkCircle className="w-5 h-5 sm:w-6 sm:h-6 text-primary-light dark:text-primary-dark" />
                    ) : (
                      <IoCheckmarkCircleOutline className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400 dark:text-gray-500" />
                    )}
                  </button>
                  <div className="flex-1">
                    <label
                      htmlFor={item.id}
                      className="block text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 cursor-pointer"
                      onClick={() => handleIndividualAgree(item.id)}
                    >
                      {item.label}
                      {item.required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                  </div>
                </div>

                {/* 약관 내용 */}
                <div className="mt-3 sm:mt-4 ml-8 sm:ml-11">
                  <div className="text-sm sm:text-base text-gray-600 dark:text-gray-400 whitespace-pre-line leading-relaxed bg-gray-50 dark:bg-[#343434] p-4 sm:p-5 rounded-md max-h-48 sm:max-h-64 overflow-y-auto">
                    {item.content}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 하단 버튼 영역 */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="flex-1 px-4 py-3 sm:py-3.5 text-base sm:text-lg font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-[#343434] hover:bg-gray-50 dark:hover:bg-[#3a3a3a] transition-colors"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleNext}
              disabled={!allChecked}
              className={`flex-1 px-4 py-3 sm:py-3.5 text-base sm:text-lg font-bold rounded-lg text-white transition-colors ${
                allChecked
                  ? "bg-primary-light hover:bg-opacity-90 dark:bg-primary-dark dark:hover:bg-opacity-90 dark:text-[#292929] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-light dark:focus:ring-primary-dark"
                  : "bg-gray-300 dark:bg-gray-600 cursor-not-allowed text-gray-500 dark:text-gray-400"
              }`}
            >
              다음 단계
            </button>
          </div>

          {/* 안내 문구 */}
          <p className="text-xs sm:text-sm text-center text-gray-500 dark:text-gray-400 pt-2">
            필수 항목에 모두 동의하셔야 회원가입을 진행하실 수 있습니다.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AgreementPage;
