"use client";

import React, { Suspense, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import LoadingSpinner from "@/components/LoadingSpinner";
import LoadingSpinnerWithText from "@/components/LoadingSpinnerWithText";
import decimal from "decimal.js";
import {
  COMMUNITY_TYPE,
  DEV_ENV,
  GROUP_TYPE,
  MEMO_PROGRAM_ID,
} from "@/constants";
import { formatDate } from "@/utils/dateUtils";
import bs58 from "bs58";
import Image from "next/image";
import { QRCodeModal } from "@/components/ui/qr-code-modal";
import { useWalletRef, triggerWalletConnect } from "@/components/ui/wallet-ref";
import { useAppKitAccount } from "@reown/appkit/react";
import { useWriteContract } from "wagmi";
import { TransactionModal } from "@/components/TransactionModal";
import { NodeConfirmModal } from "@/components/NodeConfirmModal";
import { RecommenderAlertModal } from "@/components/RecommenderAlertModal";
import { TokenType, TxFlowStatus, UserType } from "@prisma/client";
import { truncateDecimals } from "@/utils/common";
import BorderCustom from "@/components/ui/border-custom";

// Node Card Component
interface NodeCardProps {
  price: string;
  present: string;
  total: string;
  referralReward: string;
  dividendsReward: string;
  rewardCap: string;
  nodeType?: string;
  referralCode?: string;
  hasSuperior?: boolean;
  handleCommunity?: (isBigNode: boolean, recommender: string) => Promise<void>;
}

const NodeCard: React.FC<NodeCardProps> = ({
  price,
  present,
  total,
  referralReward,
  dividendsReward,
  rewardCap,
  nodeType,
  hasSuperior = false,
  handleCommunity,
}) => {
  const t = useTranslations("node");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const { address } = useAppKitAccount();

  // 根据节点类型确定显示信息
  const isGroupNode = nodeType === UserType.GROUP;
  const nodeTitle = isGroupNode ? t("node_info_text.GROUP.title") : t("node_info_text.COMMUNITY.title");
  const titleFormat = isGroupNode ? t("node_info_text.GROUP.title_format") : t("node_info_text.COMMUNITY.title_format");


  // 权益列表
  const benefits = isGroupNode
    ? [
        t("node_info_text.GROUP.min_level"),
        t("node_info_text.GROUP.reward_cap"),
        t("node_info_text.GROUP.direct_reward"),
        t("node_info_text.GROUP.dividends_reward"),
        t("node_info_text.GROUP.platform_reward"),
        t("node_info_text.GROUP.airdrop"),
        t("node_info_text.GROUP.mining"),
      ]
    : [
        t("node_info_text.COMMUNITY.min_level"),
        t("node_info_text.COMMUNITY.reward_cap"),
        t("node_info_text.COMMUNITY.direct_reward"),
        //t("node_info_text.COMMUNITY.diff_reward"),
        t("node_info_text.COMMUNITY.dividends_reward"),
        t("node_info_text.COMMUNITY.platform_reward"),
        t("node_info_text.COMMUNITY.airdrop"),
        t("node_info_text.COMMUNITY.mining"),
      ];

  return (
    <BorderCustom
      type={2}
      className="mb-2 bg-black border   overflow-hidden relative"
      style={{
        border: "1px solid #3B82F6",
      }}
    >
      <div className="p-6 flex flex-col items-center">
        {/* {t("node_icon")} */}
        <Image
          src={
            isGroupNode
              ? "/images/v2/node/group.png"
              : "/images/v2/node/community.png"
          }
          alt={nodeTitle}
          width={240}
          height={188}
        />

        {/* {t("title_and_status")} */}
        <div className="bg-blue-500 rounded-lg px-4 py-2 mt-2 mb-4">
          <h3 className="text-black font-bold text-center">
            {nodeTitle}{titleFormat}
          </h3>
        </div>

        {/* {t("benefits_list")} */}
        <BorderCustom
          className=" p-4 mb-2 -mt-8"
          style={{
            border: "1px solid rgba(59, 130, 246, 0.3)",
            paddingTop: "20px",
          }}
        >
          {benefits.map((benefit, index) => (
            <div key={index} className="flex items-center mb-1 last:mb-0">
              <div className="w-1 h-1 bg-[#3B82F6] mr-2 rounded-full"></div>
              <span
                className="text-white text-xs"
                style={{
                  color: "rgba(255, 255, 255, 0.9)",
                }}
              >
                {benefit}
              </span>
            </div>
          ))}
        </BorderCustom>

        {/* {t("purchase_button")} */}
        <button
          onClick={() => {
            if (!address) {
              triggerWalletConnect();
              return;
            }
            setShowConfirmModal(true);
          }}
          disabled={Number(present) === 0}
          className={`w-full py-3 px-4 rounded-lg font-bold text-center mb-3`}
          style={{
            background: "linear-gradient(270deg, #2563EB 0%, #60A5FA 100%)",
          }}
        >
          {price} USDT-{t("buy_now")}
        </button>

        {/* {t("invite_friends_button")} */}
        <button
          onClick={() => {
            if (!address) {
              triggerWalletConnect();
              return;
            }
            setShowQRModal(true);
          }}
          style={{
            border: "1px solid rgba(59, 130, 246, 0.3)",
            background: "rgba(59, 130, 246, 0.08)",
          }}
          className="w-full py-3 px-4  font-medium text-center  text-white  flex items-center justify-center "
        >
          <Image
            src="/images/v2/node/invite.png"
            alt="Invite"
            width={17}
            height={14}
            className="mr-1"
          />
          {t("invite_friends")}
        </button>
      </div>

      <NodeConfirmModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={() => {
          setShowConfirmModal(false);
          handleCommunity?.(nodeType === UserType.COMMUNITY, "");
        }}
        isBigNode={nodeType === UserType.COMMUNITY}
        price={price}
      />

      {/* QR Code Modal */}
      {showQRModal && address && (
        <QRCodeModal
          isOpen={showQRModal}
          onClose={() => setShowQRModal(false)}
          publicKey={address?.toString()}
          userType={nodeType || null}
        />
      )}
    </BorderCustom>
  );
};

// Node Reward Card Component
interface NodeRewardCardProps {
  iconSrc: string;
  iconAlt: string;
  title: string;
  value: string;
  unit: string;
}

const NodeRewardCard: React.FC<NodeRewardCardProps> = ({
  iconSrc,
  iconAlt,
  title,
  value,
  unit,
}) => {
  return (
    <div className="bg-black border border-gray-800 rounded-xl p-2">
      <div className="flex items-center justify-center mb-2">
        {/* <Image
      src={iconSrc}
      alt={iconAlt}
      width={12}
      height={12}
    /> */}
        <span className="text-[12px] text-gray-300 text-center">{title}</span>
      </div>
      {/* <Image
    src={iconSrc}
    alt={iconAlt}
    width={12}
    height={12}
  /> */}
      <div className="text-xg font-bold text-white text-center">
        {value} {unit}
      </div>
    </div>
  );
};

// Connected Node Details Component
interface ConnectedNodeDetailsProps {
  referralCode: string;
  activationDate: string;
  userType?: string | null;
  level: number | null;
  activePercent: number | null;
  interestActive?: boolean;
}

const ConnectedNodeDetails: React.FC<ConnectedNodeDetailsProps> = ({
  activationDate,
  userType,
  level,
  activePercent,
  interestActive,
}) => {
  const t = useTranslations("node");
  const { address } = useAppKitAccount();
  const [showQRModal, setShowQRModal] = useState(false);
  const [currentDataType, setCurrentDataType] = useState<
    "directCommunity" | "directGroup" | "indirectCommunity" | "indirectGroup"
  >("directCommunity");

  // State for referral stats
  const [referralStats, setReferralStats] = useState({
    directCommunity: { count: 0, label: t("direct_community_count") },
    directGroup: { count: 0, label: t("direct_group_count") },
    indirectCommunity: { count: 0, label: t("indirect_community_count") },
    indirectGroup: { count: 0, label: t("indirect_group_count") },
  });

  const [nodeRewardData, setNodeRewardData] = useState({
    referralRewards: 0,
    communityRewards: 0,
    incubationRewards: 0,
    dividendsRewards: 0,
  });

  // Define types for referral data
  interface ReferralItem {
    address: string;
    type: string;
    time: string;
  }

  interface ReferralData {
    directCommunity: ReferralItem[];
    directGroup: ReferralItem[];
    indirectCommunity: ReferralItem[];
    indirectGroup: ReferralItem[];
  }

  // State for referral data
  const [allReferralData, setAllReferralData] = useState<ReferralData>({
    directCommunity: [],
    directGroup: [],
    indirectCommunity: [],
    indirectGroup: [],
  });

  const fetchEarnings = async () => {
    if (!address) return;
    const earningsResponse = await fetch("/api/user/earnings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        address: address.toString(),
      }),
    });

    const earningsData = (await earningsResponse.json()).data;
    setNodeRewardData({
      referralRewards:
        (earningsData.NODE_REWARD?.[TxFlowStatus.PENDING] || 0) +
        (earningsData.NODE_REWARD?.[TxFlowStatus.CONFIRMED] || 0),
      communityRewards:
        (earningsData.STAKE_DYNAMIC_NODE_REWARD?.[TxFlowStatus.PENDING] || 0) +
        (earningsData.STAKE_DYNAMIC_NODE_REWARD?.[TxFlowStatus.CONFIRMED] || 0),
      incubationRewards:
        (earningsData.STAKE_DYNAMIC_NODE_INCUBATION_REWARD?.[
          TxFlowStatus.PENDING
        ] || 0) +
        (earningsData.STAKE_DYNAMIC_NODE_INCUBATION_REWARD?.[
          TxFlowStatus.CONFIRMED
        ] || 0),
      dividendsRewards:
        (earningsData.FEE_DIVIDEND?.[TxFlowStatus.PENDING] || 0) +
        (earningsData.FEE_DIVIDEND?.[TxFlowStatus.CONFIRMED] || 0),
    });
  };

  const formatAddress = (address: string) => {
    return (
      address.substring(0, 6) + "..." + address.substring(address.length - 4)
    );
  };

  // Fetch referral data from API
  const fetchReferralData = async () => {
    if (!address) return;

    try {
      // Fetch direct referrals with COMMUNITY type
      const directCommunityResponse = await fetch("/api/user/subordinates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          walletAddress: address.toString(),
          isDirect: true,
          nodeType: UserType.COMMUNITY,
        }),
      });
      const directCommunityData = (await directCommunityResponse.json()).data;

      // Fetch direct referrals with GROUP type
      const directGroupResponse = await fetch("/api/user/subordinates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          walletAddress: address.toString(),
          isDirect: true,
          nodeType: UserType.GROUP,
        }),
      });
      const directGroupData = (await directGroupResponse.json()).data;

      // Fetch indirect referrals with COMMUNITY type
      const indirectCommunityResponse = await fetch("/api/user/subordinates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          walletAddress: address.toString(),
          isDirect: false,
          nodeType: UserType.COMMUNITY,
        }),
      });
      const indirectCommunityData = (await indirectCommunityResponse.json())
        .data;

      // Fetch indirect referrals with GROUP type
      const indirectGroupResponse = await fetch("/api/user/subordinates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          walletAddress: address.toString(),
          isDirect: false,
          nodeType: UserType.GROUP,
        }),
      });
      const indirectGroupData = (await indirectGroupResponse.json()).data;

      // Format the data for display
      const formatReferralData = (data: any) => {
        return data.map((sub: any) => ({
          address: formatAddress(sub.address),
          type:
            sub.type === UserType.COMMUNITY
              ? t("community_title")
              : t("group_title"),
          time: formatDate(new Date(sub.buy_at || "")),
        }));
      };

      // Format the data for each category
      const formattedDirectCommunity = formatReferralData(directCommunityData);
      const formattedDirectGroup = formatReferralData(directGroupData);
      const formattedIndirectCommunity = formatReferralData(
        indirectCommunityData
      );
      const formattedIndirectGroup = formatReferralData(indirectGroupData);

      // Update the referral stats
      setReferralStats({
        directCommunity: {
          count: directCommunityData?.length || 0,
          label: t("direct_community_count"),
        },
        directGroup: {
          count: directGroupData?.length || 0,
          label: t("direct_group_count"),
        },
        indirectCommunity: {
          count: indirectCommunityData?.length || 0,
          label: t("indirect_community_count"),
        },
        indirectGroup: {
          count: indirectGroupData?.length || 0,
          label: t("indirect_group_count"),
        },
      });

      // Update the referral data with formatted data
      setAllReferralData({
        directCommunity: formattedDirectCommunity,
        directGroup: formattedDirectGroup,
        indirectCommunity: formattedIndirectCommunity,
        indirectGroup: formattedIndirectGroup,
      });
    } catch (error) {
      console.error("Error fetching referral data:", error);
    }
  };

  // Get current data based on selected type
  const currentReferralData = allReferralData[currentDataType] || [];
  const currentStats = referralStats[currentDataType];

  // Fetch data on component mount and when address changes
  useEffect(() => {
    fetchReferralData();
    fetchEarnings();
  }, [address]);

  // Handle sliding to previous data type
  const handlePrevDataType = () => {
    if (currentDataType === "directCommunity")
      setCurrentDataType("directGroup");
    else if (currentDataType === "directGroup")
      setCurrentDataType("indirectCommunity");
    else if (currentDataType === "indirectCommunity")
      setCurrentDataType("indirectGroup");
    else if (currentDataType === "indirectGroup")
      setCurrentDataType("directCommunity");
  };

  // Handle sliding to next data type
  const handleNextDataType = () => {
    if (currentDataType === "directGroup")
      setCurrentDataType("directCommunity");
    else if (currentDataType === "indirectCommunity")
      setCurrentDataType("directGroup");
    else if (currentDataType === "indirectGroup")
      setCurrentDataType("indirectCommunity");
    else if (currentDataType === "directCommunity")
      setCurrentDataType("indirectGroup");
  };

  // Format the activation date to match the design
  const formattedDate = activationDate || "2025-05-01";

  // 根据节点类型确定显示信息
  const isGroupNode = userType === UserType.GROUP;
  const isCommunityNode = userType === UserType.COMMUNITY;
  const isGalaxyNode = userType === UserType.GALAXY;

  // 节点标题和状态
  const nodeTitle = isGroupNode
    ? t("node_info_text.GROUP.title")
    : isCommunityNode
    ? t("node_info_text.COMMUNITY.title")
    : t("node_info_text.GALAXY.title");
  const isActivated = isGalaxyNode ? interestActive === true : true; // 银河节点根据interestActive判断激活状态，其他节点默认已激活
  const statusText = isActivated ? t("activated") : t("unactivated");

  // 节点图片
  const nodeImage = isGroupNode
    ? "/images/v2/node/group.png"
    : isCommunityNode
    ? "/images/v2/node/community.png"
    : isActivated
    ? "/images/v2/node/galaxy-active.png"
    : "/images/v2/node/galaxy.png";

  // 权益列表
  const benefits = isGroupNode
    ? [
        t("node_info_text.GROUP.min_level"),
        t("node_info_text.GROUP.reward_cap"),
        t("node_info_text.GROUP.direct_reward"),
        t("node_info_text.GROUP.dividends_reward"),
        t("node_info_text.GROUP.platform_reward"),
        t("node_info_text.GROUP.airdrop"),
        t("node_info_text.GROUP.mining"),
      ]
    : isCommunityNode
    ? [
        t("node_info_text.COMMUNITY.min_level"),
        t("node_info_text.COMMUNITY.reward_cap"),
        t("node_info_text.COMMUNITY.direct_reward"),
        //t("node_info_text.COMMUNITY.diff_reward"),
        t("node_info_text.COMMUNITY.dividends_reward"),
        t("node_info_text.COMMUNITY.platform_reward"),
        t("node_info_text.COMMUNITY.airdrop"),
        t("node_info_text.COMMUNITY.mining"),
      ]
    : [
        t("node_info_text.GALAXY.direct_reward"),
        //t("node_info_text.GALAXY.diff_reward"),
        t("node_info_text.GALAXY.dividends_reward"),
        t("node_info_text.COMMUNITY.platform_reward"),
      ];

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 pb-16 pt-28">
        {/* Main Node Card */}
        <div className="mx-4">
          <BorderCustom
            type={2}
            className="bg-black overflow-hidden relative"
            style={{
              border: "1px solid #3B82F6",
            }}
          >
            <div className="p-6 flex flex-col items-center">
              {/* {t("node_icon")} */}
              <Image src={nodeImage} alt={nodeTitle} width={240} height={188} />

              {/* {t("title_and_status")} */}
              <div className="flex items-center h-[40px] w-[250px] border border-blue-500 rounded-lg">
                <div className="text-black font-bold text-lg bg-[#3B82F6] h-full flex-1 rounded-l-lg flex items-center justify-center">
                  {nodeTitle}
                </div>
                <div
                  className={`  text-lg flex-1 text-[#3B82F6] text-center bg-black relative z-10`}
                >
                  {statusText}
                </div>
              </div>

              {/* {t("benefits_list")} */}
              <BorderCustom
                className="pt-4 pb-2 mb-4 w-full -mt-6"
                style={{
                  border: "1px solid rgba(59, 130, 246, 0.3)",
                  paddingTop: "30px",
                }}
              >
                {benefits.map((benefit, index) => (
                  <div
                    key={index}
                    className="flex items-center mb-1 last:mb-0 px-4"
                  >
                    <div className="w-1 h-1 bg-[#3B82F6] mr-2 rounded-full"></div>
                    <span
                      className={`text-xs ${
                        userType === UserType.GROUP
                          ? "text-white"
                          : "text-[#60A5FA]"
                      }`}
                    >
                      {benefit}
                    </span>
                  </div>
                ))}
                {/* {t("equity_status_or_activation_progress")} */}
                {isActivated ? (
                  <div
                    className="text-[#3B82F6] text-md text-center pt-1 font-bold"
                    style={{
                      borderTop: "1px solid rgb(5, 47, 81)",
                    }}
                  >
                    {t("equity_effective")}
                  </div>
                ) : isGalaxyNode && activePercent !== null ? (
                  <div className="w-full  px-4 my-2">
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div
                        className=" h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${activePercent}%`,
                          background:
                            "linear-gradient(270deg, #2563EB 0%, #60A5FA 100%)",
                        }}
                      ></div>
                    </div>
                    <div className="text-xs text-[#3B82F6] flex flex-col mt-2">
                      <span>
                        {t("node_info_text.GALAXY.active_percent") + activePercent + '%'}
                      </span>
                      <span>{t("node_info_text.GALAXY.active_condition")}</span>
                    </div>
                  </div>
                ) : null}
              </BorderCustom>

              {/* {t("invite_friends_button")} */}
              <button
                onClick={() => {
                  if (address) {
                    setShowQRModal((prev) => !prev);
                  }
                }}
                className="w-full py-3 px-4 rounded-lg font-medium text-center text-black flex items-center justify-center"
                style={{
                  background:
                    "linear-gradient(270deg, #2563EB 0%, #60A5FA 100%)",
                }}
              >
                <Image
                  src="/images/v2/node/invite-b.png"
                  alt="Invite"
                  width={17}
                  height={14}
                  className="mr-1"
                />
                {t("invite_friends")}
              </button>
            </div>
          </BorderCustom>
        </div>

        {/* Node Reward Data Section */}
        <div className="mx-4 mt-3">
          <div className="bg-black overflow-hidden">
            {/* Header */}
            <div className="flex items-center">
              <div className="w-1 h-5 bg-[#3B82F6] mr-1"></div>
              <h2 className="text-md font-medium text-white">
                {t("node_reward_data")}
              </h2>
            </div>

            {/* Reward Cards Grid */}
            <div className="grid grid-cols-2 gap-1 my-2">
              <BorderCustom
                className="bg-black border   p-2"
                style={{
                  border: "1px solid rgba(59, 130, 246, 0.3)",
                }}
              >
                <div className="flex items-center justify-center mb-2">
                  <Image
                    src="/images/v2/node/icon1.png"
                    alt="Referral"
                    width={12}
                    height={10}
                    className="mr-1"
                  />
                  <span className="text-[12px] text-white ">
                    {t("referral_reward")}
                  </span>
                </div>
                <div className="text-sm font-bold text-white text-center">
                  {truncateDecimals(nodeRewardData.referralRewards)} USDT
                </div>
              </BorderCustom>

              <BorderCustom
                className="bg-black border  p-2"
                style={{
                  border: "1px solid rgba(59, 130, 246, 0.3)",
                }}
              >
                <div className="flex items-center justify-center mb-2">
                  <Image
                    src="/images/v2/node/icon2.png"
                    alt="Referral"
                    width={13}
                    height={13}
                    className="mr-1"
                  />
                  <span className="text-[12px] text-white ">
                    {t("dividends_reward")}
                  </span>
                </div>
                <div className="text-sm font-bold text-white text-center">
                  {truncateDecimals(nodeRewardData.dividendsRewards)} TXT
                </div>
              </BorderCustom>
            </div>
            <div className="flex justify-center">
              <BorderCustom
                className="bg-black border  p-2 col-span-2 w-1/2"
                style={{
                  border: "1px solid rgba(59, 130, 246, 0.3)",
                }}
              >
                <div className="flex items-center justify-center mb-2">
                  <Image
                    src="/images/v2/node/icon3.png"
                    alt="Referral"
                    width={12}
                    height={12}
                    className="mr-1"
                  />
                  <span className="text-[12px] text-white ">
                    {t("platform_reward")}
                  </span>
                </div>
                <div className="text-sm font-bold text-white text-center">
                  0.00 TXT
                </div>
              </BorderCustom>
            </div>
          </div>
        </div>

        {/* Node Promotion Data Section */}
        <div className="mx-4 mt-3">
          <div className="bg-black overflow-hidden">
            {/* Header */}
            <div className="flex items-center">
              <div className="w-1 h-5 bg-[#3B82F6] mr-1"></div>
              <h2 className="text-md font-medium text-white">
                {t("node_promotion")}
              </h2>
            </div>

            {/* Referral Count with Sliding */}
            <div
              style={{
                background: "linear-gradient(270deg, #2563EB 0%, #60A5FA 100%)",
              }}
              className=" px-4 py-2 flex items-center justify-between text-black rounded-t-lg mt-2"
            >
              <button onClick={handlePrevDataType} className="text-white">
                <Image
                  src="/images/v2/node/left-arrow.png"
                  alt="Prev"
                  width={10}
                  height={14}
                />
              </button>
              <div className="text-center font-bold">
                <div className=" text-xs">{currentStats.label}</div>
                <div className="text-xs ">{currentStats.count}</div>
              </div>
              <button onClick={handleNextDataType} className="text-white">
                <Image
                  src="/images/v2/node/right-arrow.png"
                  alt="Next"
                  width={10}
                  height={14}
                />
              </button>
            </div>

            {/* Referral Table */}
            <BorderCustom
              className="p-2"
              style={{
                border: "1px solid rgba(59, 130, 246, 0.3)",
              }}
            >
              <div className="grid grid-cols-3 text-[#3B82F6] text-xs mb-2">
                <div>{t("address")}</div>
                <div className="text-center">{t("type")}</div>
                <div className="text-right">{t("time")}</div>
              </div>

              {/* Table Rows */}
              {currentReferralData.length > 0 ? (
                currentReferralData.map((item, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-3 py-3 border-b border-gray-800 text-white text-xs"
                  >
                    <div className="truncate">{item.address}</div>
                    <div className="text-center">{item.type}</div>
                    <div className="text-right">{item.time}</div>
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-400 py-4 text-sm">
                  {t("no_referrals_found")}
                </div>
              )}
            </BorderCustom>
          </div>
        </div>

        {/* QR Code Modal */}
        {showQRModal && address && (
          <QRCodeModal
            isOpen={showQRModal}
            onClose={() => setShowQRModal(false)}
            publicKey={address?.toString()}
            userType={userType || null}
          />
        )}
      </div>
    </div>
  );
};

// Node data type definitions
interface NodeData {
  price_display: number;
  price_transfer: number;
  maxNum: number;
  leftNum: number;
  referralReward: number;
  minLevel: number;
  incubationReward: number;
  dynamicRewardCap: number;
  dynamicRewardCapIncrement: number;
  dividendReward: number;
}

interface NodesData {
  groupNode: NodeData;
  communityNode: NodeData;
}

interface Env {
  environment: string;
  hotWalletAddress: string;
}

// Node Market Component (shown when wallet is not connected or user doesn't own a node)
interface NodeMarketProps {
  nodeData: NodesData | null;
  userInfo: {
    type: string | null;
    level: number | null;
    superior: string | null;
    referral_code: string | null;
    created_at: string | null;
    buy_at: string | null;
  } | null;
  handleCommunity: (isBigNode: boolean, recommender: string) => Promise<void>;
}

const NodeMarket: React.FC<NodeMarketProps> = ({
  nodeData,
  userInfo,
  handleCommunity,
}) => {
  const t = useTranslations("node");

  if (!nodeData) {
    return <LoadingSpinner />;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 pb-16 pt-28">
        <div className="p-4 bg-black text-white">
          {/* <h1 className="text-2xl font-bold mb-6 flex items-center">
            <div className="w-1 h-6 bg-gradient-to-b from-gradient-purple-0% to-gradient-purple-100% mr-2"></div>
            {t('market_title')}
          </h1> */}
          {/* 行星节点 (Planet Node) */}
          <NodeCard
            price={nodeData.groupNode.price_display.toString()}
            present={`${nodeData.groupNode.leftNum}`}
            total={nodeData.groupNode.maxNum.toString()}
            referralReward={`${new decimal(nodeData.groupNode.referralReward)
              .mul(100)
              .toString()}% USDT`}
            dividendsReward={`${new decimal(0.1).mul(100).toString()}% ${t(
              "total_fee"
            )}`}
            rewardCap={`${new decimal(
              nodeData.groupNode.dynamicRewardCap
            ).toString()} USDT`}
            nodeType={UserType.GROUP}
            hasSuperior={!!userInfo?.superior}
            handleCommunity={handleCommunity}
          />

          {/* 恒星节点 (Star Node) */}
          <NodeCard
            price={nodeData.communityNode.price_display.toString()}
            present={`${nodeData.communityNode.leftNum}`}
            total={nodeData.communityNode.maxNum.toString()}
            referralReward={`${new decimal(
              nodeData.communityNode.referralReward
            )
              .mul(100)
              .toString()}% USDT`}
            dividendsReward={`${new decimal(0.1).mul(100).toString()}% ${t(
              "total_fee"
            )}`}
            rewardCap={`${new decimal(
              nodeData.communityNode.dynamicRewardCap
            ).toString()} USDT`}
            nodeType={UserType.COMMUNITY}
            hasSuperior={!!userInfo?.superior}
            handleCommunity={handleCommunity}
          />
        </div>
      </div>
    </div>
  );
};

function NodeContent() {
  const { address } = useAppKitAccount();
  const [userInfo, setUserInfo] = useState<{
    type: string | null;
    level: number | null;
    superior: string | null;
    referral_code: string | null;
    created_at: string | null;
    buy_at: string | null;
    active_percent: number | null;
    interest_active?: boolean;
  } | null>(null);
  const [nodeData, setNodeData] = useState<NodesData | null>(null);
  const [env, setEnv] = useState<Env | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [txSignature, setTxSignature] = useState<string | null>(null);
  const [showTxModal, setShowTxModal] = useState(false);
  const [showTxErrorModal, setShowTxErrorModal] = useState(false);
  const [txErrorMessage, setTxErrorMessage] = useState<string | null>(null);
  const t = useTranslations("node");

  const fetchUserInfo = async () => {
    try {
      if (!address) {
        setUserInfo(null);
        return;
      }

      const response = await fetch(
        `/api/user/info?address=${address.toString()}`
      );
      const data = await response.json();
      console.log("🚀 ~ ConnectedNodeDetails ~ data:", data);
      setUserInfo(data);
    } catch (error) {
      console.error("Error fetching user info:", error);
    }
  };

  // Define USDT ABI for the transfer function
  const usdtAbi = [
    {
      name: "transfer",
      type: "function",
      stateMutability: "nonpayable",
      inputs: [
        { name: "to", type: "address" },
        { name: "value", type: "uint256" },
      ],
      outputs: [{ name: "", type: "bool" }],
    },
  ] as const;

  // Setup contract write hook
  const { writeContractAsync, isPending: isWritePending } = useWriteContract();

  const transferTokens = async (amount: number): Promise<string> => {
    if (!address) {
      setError("Wallet not connected");
      throw new Error("Wallet not connected");
    }

    try {
      setError(null);

      // Check if hot wallet address is set
      if (!env?.hotWalletAddress) {
        throw new Error("Hot wallet address environment variable is not set");
      }

      // Convert amount to proper decimals
      // Since the API now returns price_transfer as a string without scientific notation,
      // we can safely convert it to BigInt
      const amountInWei = BigInt(amount);

      setIsJoining(true);
      // Get the USDT contract address from environment variables
      const tokenAddress = process.env.NEXT_PUBLIC_USDT_ADDRESS;
      if (!tokenAddress) {
        throw new Error(
          "USDT contract address not found in environment variables"
        );
      }

      // Use wagmi's writeContractAsync function to send the transaction
      // In wagmi v2, we need to use the async version to get the hash
      const hash = await writeContractAsync({
        address: tokenAddress as `0x${string}`,
        abi: usdtAbi,
        functionName: "transfer",
        args: [env.hotWalletAddress as `0x${string}`, amountInWei],
      });

      // If hash is undefined, throw an error
      if (!hash) {
        throw new Error("Transaction failed to return a hash");
      }

      const tx = { hash };

      // Set transaction signature and show modal
      setTxSignature(tx.hash);
      setShowTxModal(true);

      return tx.hash;
    } catch (error) {
      console.error("Error sending transaction:", error);
      setError("Failed to send transaction. Please try again.");
      throw error;
    } finally {
      setIsJoining(false);
    }
  };

  const handleCommunity = async (isBigNode: boolean, recommender: string) => {
    if (!address) {
      triggerWalletConnect();
      return;
    }
    if (isJoining) return;
    setIsJoining(true);
    try {
      setError(null);
      setSuccess(null);

      if (!address) {
        setError("Please connect your wallet first");
        return;
      }

      if (!nodeData) {
        setError("Node data not found");
        return;
      }

      const points = isBigNode
        ? nodeData.communityNode.price_transfer
        : nodeData.groupNode.price_transfer;
      if (isNaN(points) || points <= 0) {
        setError("Please enter a valid positive number");
        return;
      }

      // Convert points to USDT amount (6 decimals)
      const type = isBigNode ? COMMUNITY_TYPE : GROUP_TYPE;
      if (!type) {
        throw new Error(
          `Invalid points amount. Must be either ${nodeData?.groupNode?.price_display} USDT or ${nodeData?.communityNode?.price_display} USDT, present points: ${points}`
        );
      }

      let txSig;
      if (env?.environment === DEV_ENV) {
        console.warn("Using mock transaction hash in development mode");
        // Generate a random base58 string of correct length for Solana tx hash
        const randomBytes = new Uint8Array(32);
        crypto.getRandomValues(randomBytes);
        txSig = bs58.encode(randomBytes);
      } else {
        txSig = await transferTokens(points);
      }

      // Show transaction signature in modal
      setTxSignature(txSig);
      setShowTxModal(true);

      // Call points/community endpoint with transaction signature
      const response = await fetch("/api/points/community", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          txHash: txSig,
          dev_address: address.toString(),
          dev_referralCode: recommender,
          dev_type: type,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to verify transaction");
      }
      setSuccess("Joined successfully");

      // Refresh the page after successful transaction
    } catch (err) {
      setTxErrorMessage(
        err instanceof Error ? err.message : "Failed to verify transaction"
      );
      setShowTxErrorModal(true);
    } finally {
      fetchUserInfo();
      setIsJoining(false);
    }
  };

  // Effect for fetching node data - only runs once
  useEffect(() => {
    const fetchEnv = async () => {
      try {
        // Check if we already have node data
        if (env) return;

        const response = await fetch("/api/info/env", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        });
        const data = await response.json();
        setEnv(data);
      } catch (error) {
        console.error("Error fetching node data:", error);
      }
    };
    const fetchNodeData = async () => {
      try {
        // Check if we already have node data
        if (nodeData) return;

        const response = await fetch("/api/info/node", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        });
        const data = await response.json();
        setNodeData(data);
      } catch (error) {
        console.error("Error fetching node data:", error);
      }
    };

    fetchEnv();
    fetchNodeData();
  }, []); // Empty dependency array means this only runs once

  // Effect for fetching user info - runs when address changes
  useEffect(() => {
    fetchUserInfo();
  }, [address]);

  const hasNode =
    userInfo?.type === GROUP_TYPE ||
    userInfo?.type === COMMUNITY_TYPE ||
    userInfo?.type === UserType.GALAXY;

  if (!nodeData) {
    return <LoadingSpinner />;
  }

  // Calculate rewards for the connected node details
  const referralReward =
    hasNode && userInfo.type === COMMUNITY_TYPE
      ? `${new decimal(nodeData.communityNode.referralReward)
          .mul(100)
          .toString()}% USDT`
      : `${new decimal(nodeData.groupNode.referralReward)
          .mul(100)
          .toString()}% USDT`;

  const dividendsReward =
    hasNode && userInfo.type === COMMUNITY_TYPE
      ? `${new decimal(0.1).mul(100).toString()}% ${t("total_fee")}`
      : `${new decimal(0.1).mul(100).toString()}% ${t("total_fee")}`;

  // const incubationMiningReward =
  //   hasNode && userInfo.type === COMMUNITY_TYPE
  //     ? `${new decimal(nodeData.communityNode.incubationReward)
  //         .mul(100)
  //         .toString()}% TOKE`
  //     : `${new decimal(nodeData.groupNode.incubationReward)
  //         .mul(100)
  //         .toString()}% TXT`;

  // const rewardCapStr =
  //   hasNode && userInfo.type === COMMUNITY_TYPE
  //     ? `${new decimal(nodeData.communityNode.dynamicRewardCap).toString()} TXT`
  //     : `${new decimal(nodeData.groupNode.dynamicRewardCap).toString()} TXT`;

  const rewardCap =
    hasNode && userInfo.type === COMMUNITY_TYPE
      ? new decimal(nodeData.communityNode.dynamicRewardCap)
      : new decimal(nodeData.groupNode.dynamicRewardCap);

  if (isJoining) {
    return <LoadingSpinnerWithText />;
  }

  return (
    <>
      <TransactionModal
        isOpen={showTxModal}
        onClose={() => {
          setShowTxModal(false);
          window.location.reload();
        }}
        type="success"
        txSignature={txSignature}
      />
      <TransactionModal
        isOpen={showTxErrorModal}
        onClose={() => setShowTxErrorModal(false)}
        type="error"
        message={txErrorMessage}
      />
      {hasNode ? (
        <ConnectedNodeDetails
          referralCode={userInfo.referral_code || ""}
          activationDate={formatDate(new Date(userInfo.buy_at || ""))}
          userType={userInfo.type}
          level={userInfo.level}
          activePercent={userInfo.active_percent}
          interestActive={userInfo.interest_active}
        />
      ) : (
        <NodeMarket
          nodeData={nodeData}
          userInfo={userInfo}
          handleCommunity={handleCommunity}
        />
      )}
    </>
  );
}

export default function NodePage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <main>
        <Suspense fallback={<LoadingSpinner />}>
          <NodeContent />
        </Suspense>
      </main>
    </div>
  );
  // const router = useRouter();
  
  // // Redirect to home page on component mount
  // useEffect(() => {
  //   router.push("/");
  // }, [router]);

  // // Return empty div while redirecting
  // return <div className="min-h-screen bg-black"></div>;
}
