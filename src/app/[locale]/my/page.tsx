"use client";

import React, { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import LoadingSpinner from "@/components/LoadingSpinner";
import { TokenType, TxFlowType, UserType } from "@prisma/client";
import { generateOperationHash } from "@/utils/auth";
import bs58 from "bs58";
import { triggerWalletConnect } from "@/components/ui/wallet-ref";
import { QRCodeModal } from "@/components/ui/qr-code-modal"; // 引入 QRCodeModal 组件
import { ErrorCode } from "@/lib/errors";
import { useAppKitAccount } from "@reown/appkit/react";
import { useSignMessage } from "wagmi";
import { RecommenderModal } from "@/components/ui/recommender-modal";
import { truncateDecimals, truncateDecimalsStr } from "@/utils/common";
import decimal from "decimal.js";
import BorderCustom from "@/components/ui/border-custom";

interface UserInfo {
  type: string | null;
  level: number;
  usdt_points: number;
  token_points: number;
  usdt_withdrawable: number;
  token_withdrawable: number;
  token_locked_points: number;
  token_staked_points: number;
  referral_code?: string;
  superior_referral_code?: string;
  interest_active: boolean;
}

function MyContent() {
  const { address } = useAppKitAccount();
  const { signMessageAsync } = useSignMessage();
  const t = useTranslations("my");
  const tUserType = useTranslations("user_type");
  const tErrors = useTranslations("errors");
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [showCashOutModal, setShowCashOutModal] = useState(false);
  const [showInternalTransferModal, setShowInternalTransferModal] =
    useState(false);
  const [showFlashSwapModal, setShowFlashSwapModal] = useState(false);
  const [transferMode, setTransferMode] = useState<"cashout" | "internal">(
    "cashout"
  );
  const [showRecommenderModal, setShowRecommenderModal] = useState(false);
  const [showRecommenderConfirmModal, setShowRecommenderConfirmModal] =
    useState(false);

  const [showCopiedNotification, setShowCopiedNotification] = useState(false); // Add state for copy notification

  const [cashOutAmount, setCashOutAmount] = useState("0.00");
  const [toAddress, setToAddress] = useState<string>("");
  const [cashOutTokenType, setCashOutTokenType] = useState<TokenType>(
    TokenType.USDT
  );

  useEffect(() => {
    if (address) {
      setToAddress(address);
    }
  }, [address]);

  const roleTypes = [
    {
      type: UserType.COMMUNITY,
      label: tUserType("COMMUNITY"),
      icon: "/images/v2/my/COMMUNITY-node.png",
    },
    {
      type: UserType.GALAXY,
      label: tUserType("GALAXY"),
      icon: "/images/v2/my/GALAXY-node.png",
    },
    {
      type: UserType.GROUP,
      label: tUserType("GROUP"),
      icon: "/images/v2/my/GROUP-node.png",
    },
    {
      type: UserType.NORMAL,
      label: tUserType("NORMAL"),
      icon: "/images/v2/my/NORMAL-node.png",
    }
  ];
  const [showTokenTypeDropdown, setShowTokenTypeDropdown] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recommenderError, setRecommenderError] = useState<string | null>(null);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [superiorReferralCode, setSuperiorReferralCode] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [version, setVersion] = useState("1.0"); // Default version until fetched
  const [showQRModal, setShowQRModal] = useState(false); // 新增二维码弹窗状态
  const [minCashOutAmountToken, setMinCashOutAmountToken] = useState(0);
  const [constantFee, setConstantFee] = useState(0.1);
  const [withdrawTokenFeeRatio, setWithdrawTokenFeeRatio] = useState(0.02);
  const [minCashOutAmountUsdt, setMinCashOutAmountUsdt] = useState(0);
  const [withdrawResult, setWithdrawResult] = useState("");
  const [tokenPrice, setTokenPrice] = useState(0.1); // Default token price in USDT

  const encoder = new TextEncoder();

  const formatAddress = (address: string | undefined) => {
    if (!address) return "";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const handleCopy = () => {
    if (address) {
      navigator.clipboard
        .writeText(address)
        .then(() => {
          setShowCopiedNotification(true);
          // Auto-hide notification after 2 seconds
          setTimeout(() => {
            setShowCopiedNotification(false);
          }, 2000);
        })
        .catch((err) => {
          console.error("Failed to copy: ", err);
        });
    }
  };

  const fetchUserInfo = async () => {
    if (!address) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/user/info?address=${address}`);
      if (response.ok) {
        const data = await response.json();

        // Convert string values to numbers
        const parsedData = {
          ...data,
          usdt_points: Number(data.usdt_points),
          token_points: Number(data.token_points),
          usdt_withdrawable: Number(data.usdt_withdrawable),
          superior_referral_code: data.superior_referral_code,
          token_withdrawable: Number(data.token_withdrawable),
          token_locked_points: Number(data.token_locked_points),
          token_staked_points: Number(data.token_staked_points),
          referral_code: data.referral_code,
          interest_active: data.interest_active,
        };

        setUserInfo(parsedData);
      }
    } catch (error) {
      console.error("Error fetching user info:", error);
    } finally {
      setLoading(false);
    }
  };

  const flashSwapPoints = async (
    info: {
      operationType: TxFlowType;
      amount: number;
      walletAddress: string;
      timestamp: number;
      tokenType: string;
    },
    signature: string
  ) => {
    if (!address) {
      setError("Wallet not connected");
      return;
    }

    try {
      setLoading(true);
      setWithdrawError(null);

      const response = await fetch("/api/points/flash-swap", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...info, signature }),
      });

      if (!response.ok) {
        const error = await response.json();
        setWithdrawError(tErrors(error.error));
        return;
      }

      const { success } = await response.json();
      setWithdrawResult("success");
      // Refresh points after withdrawing
      fetchUserInfo();
    } catch (err) {
      setError(err instanceof Error ? err.message : ErrorCode.SERVER_ERROR);
    } finally {
      setLoading(false);
    }
  };

  const withdrawPoints = async (
    info: {
      operationType: TxFlowType;
      amount: number;
      walletAddress: string;
      timestamp: number;
      tokenType: string;
    },
    signature: string
  ) => {
    if (!address) {
      setError("Wallet not connected");
      return;
    }

    try {
      setLoading(true);
      setWithdrawError(null);

      const response = await fetch("/api/points/withdraw", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...info, signature }),
      });

      if (!response.ok) {
        const error = await response.json();
        setWithdrawError(tErrors(error.error));
        return;
      }

      const { success } = await response.json();
      setWithdrawResult("success");
      // Refresh points after withdrawing
      fetchUserInfo();
    } catch (err) {
      setError(err instanceof Error ? err.message : ErrorCode.SERVER_ERROR);
    } finally {
      setLoading(false);
    }
  };

  const transferPoints = async (
    info: {
      operationType: TxFlowType;
      amount: number;
      walletAddress: string;
      timestamp: number;
      tokenType: string;
    },
    signature: string
  ) => {
    if (!address) {
      setError("Wallet not connected");
      return;
    }

    try {
      setLoading(true);
      setWithdrawError(null);

      const response = await fetch("/api/points/inner-transfer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...info, signature }),
      });

      if (!response.ok) {
        const error = await response.json();
        setWithdrawError(tErrors(error.error));
        return;
      }

      const { success } = await response.json();
      setWithdrawResult("success");
      // Refresh points after withdrawing
      fetchUserInfo();
    } catch (err) {
      setError(err instanceof Error ? err.message : ErrorCode.SERVER_ERROR);
    } finally {
      setLoading(false);
    }
  };

  const handleFlashSwap = async () => {
    try {
      setError(null);

      if (!address || !signMessageAsync) {
        setError("Please connect your wallet first");
        return;
      }

      const points = parseFloat(cashOutAmount);
      if (isNaN(points)) {
        setError("Please enter a valid positive number");
        return;
      }

      if (!address) {
        setError("Please connect your wallet first");
        return;
      }

      const info = {
        operationType: TxFlowType.FLASH_SWAP,
        amount: points,
        tokenType: TokenType.TXT,
        walletAddress: address,
        description: "",
        timestamp: Date.now(),
      };
      const hash = await generateOperationHash(info);
      const signature = await signMessageAsync({ message: hash });
      await flashSwapPoints(info, signature);
      //setShowCashOutModal(false);
    } catch (err) {
      console.log(
        `Error ${transferMode === "cashout" ? "withdrawing" : "transferring"
        } points: ${err}`
      );
      setWithdrawError(tErrors(ErrorCode.OPERATION_FAILED));
    }
  };

  const handleWithdrawPoints = async () => {
    try {
      setError(null);

      if (!address || !signMessageAsync) {
        setError("Please connect your wallet first");
        return;
      }

      const points = parseFloat(cashOutAmount);
      if (isNaN(points)) {
        setError("Please enter a valid positive number");
        return;
      }

      if (!address) {
        setError("Please connect your wallet first");
        return;
      }

      const info = {
        operationType:
          transferMode === "cashout" ? TxFlowType.OUT : TxFlowType.TRANSFER,
        amount: points,
        tokenType: cashOutTokenType,
        walletAddress: address,
        description: toAddress,
        timestamp: Date.now(),
      };
      const hash = await generateOperationHash(info);
      const signature = await signMessageAsync({ message: hash });
      if (transferMode === "cashout") {
        await withdrawPoints(info, signature);
      } else {
        await transferPoints(info, signature);
      }
      //setShowCashOutModal(false);
    } catch (err) {
      console.log(
        `Error ${transferMode === "cashout" ? "withdrawing" : "transferring"
        } points: ${err}`
      );
      setWithdrawError(tErrors(ErrorCode.OPERATION_FAILED));
    }
  };

  // Function to update the superior referral code

  const fetchVersion = async () => {
    try {
      const response = await fetch("/api/info/env", {
        method: "POST",
      });
      if (response.ok) {
        const data = await response.json();
        setVersion(data.version);
        setMinCashOutAmountToken(data.minCashOutAmountToken);
        setMinCashOutAmountUsdt(data.minCashOutAmountUsdt);
        setConstantFee(data.constantFee);
        setWithdrawTokenFeeRatio(data.withdrawTokenFeeRatio);
      }
    } catch (error) {
      console.error("Error fetching version:", error);
    }
  };

  const fetchTokenPrice = async () => {
    try {
      const response = await fetch("/api/info/token-price");
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data && data.data.tokenPrice) {
          setTokenPrice(
            new decimal(data.data.tokenPrice).toNumber()
          );
        }
      }
    } catch (error) {
      console.error("Error fetching token price:", error);
    }
  };

  // Fetch user info when wallet is connected
  useEffect(() => {
    if (address) {
      fetchUserInfo();
    }
  }, [address]);

  // Fetch version info on component mount
  useEffect(() => {
    fetchVersion();
  }, []);

  // Fetch token price when flash swap modal opens
  useEffect(() => {
    if (showFlashSwapModal) {
      fetchTokenPrice();
    }
  }, [showFlashSwapModal]);

  const menuItems = [
    //{ key: 'invite', label: t('invite'), href: '/my/community' },
    { key: "my_invites", label: t("my_invites"), href: "/my/invites" },
    // { key: 'my_community', label: t('my_community'), href: '/my/community' },
    // { key: 'my_stake', label: t('my_stake'), href: '/my/burning' },
    {
      key: "my_withdrawals",
      label: t("my_withdrawals"),
      href: "/my/withdrawals",
    },
    { key: "my_proclaim", label: t("my_proclaim"), href: "/my/proclaim" },
  ];

  const socialLinks = [
    //{ key: 'official_site', label: t('official_site'), icon: '/images/social/ait.svg', href: 'https://ait.ai/' },
    {
      key: "twitter",
      label: t("twitter"),
      icon: "/images/social/x.svg",
      href: "https://x.com/ai_ait",
    },
    {
      key: "telegram",
      label: t("telegram"),
      icon: "/images/social/telegram.svg",
      href: "https://t.me/aitglobal",
    },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Main content area with bottom padding for nav and top padding for header */}
      <div className="flex-1 pb-16 pt-24">
        <div className="p-4 bg-black text-white">
          {/* Header Section with Logo and Identity */}
          <div className="mb-2">
            <div className="flex items-center justify-between">
              {/* Logo */}
              <div
                className="w-16 h-16  flex items-center justify-center"
                style={{
                  border: "1px solid #3B82F6",
                  borderRadius: "4px",
                }}
              >
                <Image
                  src="/images/v2/my/avatar.png"
                  alt="Logo"
                  width={36}
                  height={40}
                />
              </div>

              {/* Identity and Community Info */}
              <div className="flex-1 ml-4">
                <div
                  className="flex items-center mb-2 "
                  style={{
                    border: "1px solid #3B82F6",
                    borderRadius: "4px",
                    letterSpacing: "0.5em",
                    padding: "2px 8px",
                    width: "fit-content",
                  }}
                >
                  <span className="text-white text-sm font-medium">
                    {t("identity")}:
                  </span>
                  <span
                    className="text-sm"
                    style={{
                      color: "rgba(255, 255, 255, 0.65)",
                    }}
                  >
                    {userInfo?.type == UserType.GALAXY ? 
                      (userInfo?.interest_active ? t("activated") : t("unactivated")) : ""
                    }
                    {roleTypes.find((item) => item.type === userInfo?.type)
                      ?.label || tUserType(UserType.NORMAL)}
                  </span>
                  <Image
                    src={
                      userInfo?.type == UserType.GALAXY ? 
                        (userInfo?.interest_active ? "/images/v2/my/GALAXY-node.png" : "/images/v2/my/GALAXY-unactive-node.png") :
                        roleTypes.find((item) => item.type === userInfo?.type)
                          ?.icon || "/images/v2/my/GALAXY-unactive-node.png"
                    }
                    alt="Role"
                    width={30}
                    height={24}
                  />
                </div>
                <div
                  className="flex items-center"
                  style={{
                    border: "1px solid #3B82F6",
                    borderRadius: "4px",
                    letterSpacing: "0.5em",
                    padding: "2px 8px",
                    width: "fit-content",
                  }}
                >
                  <span className="text-white text-sm font-medium">
                    {t("community_level")}: L{userInfo?.level || 0}
                  </span>
                  <Image
                    src={`/images/badges/v${userInfo?.level || 0}.svg`}
                    alt="Level"
                    width={20}
                    height={20}
                    className="mr-2"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Wallet Address Section */}
          <BorderCustom
            className="flex items-center justify-between mb-2"
            style={{
              border: "1px solid rgba(59, 130, 246, 0.3)",
              padding: "2px 0",
              fontSize: "10px",
              color: "rgba(255, 255, 255, 0.8)",
            }}
          >
            <div
              className="flex-1 flex flex-col px-2"
              style={{
                color: "rgba(255, 255, 255, 0.74)",
              }}
            >
              <span className=" text-sm font-medium">{t("my_address")}</span>
              <span className=" text-sm font-mono max-w-[260px] truncate">
                {address
                  ? address
                  : "0x21286acbcd2b7c8f5bfd7ffbf8587elf09571e38"}
              </span>
            </div>

            <div
              onClick={handleCopy}
              className="w-[50px] h-[42px] text-xs text-white  flex items-center justify-center "
              style={{
                borderLeft: "1px solid rgba(59, 130, 246, 0.3)",
              }}
            >
              {t("copy")}
            </div>
          </BorderCustom>

          {/* Balance Section */}
          <BorderCustom
            className="mb-2 py-2"
            style={{
              border: "1px solid rgba(59, 130, 246, 0.3)",
              color: "rgba(255, 255, 255, 0.8)",
            }}
          >
            <div className="flex ">
              {/* TXT Balance Card */}
              <div
                style={{
                  borderRight: "1px solid rgba(59, 130, 246, 0.3)",
                }}
                className="flex-1 flex flex-col items-center justify-center"
              >
                <div className="flex items-center justify-center ">
                  <Image
                    src="/images/v2/my/avatar.png"
                    alt="TXT"
                    width={14}
                    height={16}
                  />
                  <span className="text-white text-sm font-semibold ml-1">
                    TXT
                  </span>
                </div>
                <div className="text-lg font-bold text-white">
                  {loading ? (
                    <div className="flex justify-center">
                      <LoadingSpinner size="sm" />
                    </div>
                  ) : (
                    truncateDecimals(userInfo?.token_points || 0)
                  )}
                </div>
              </div>

              {/* USDT Balance Card */}
              <div className="flex-1 flex flex-col items-center justify-center">
                <div className="flex items-center justify-center ">
                  <Image
                    src="/images/v2/my/usdt.png"
                    alt="USDT"
                    width={14}
                    height={14}
                  />
                  <span className="text-white text-sm font-semibold ml-1">
                    USDT
                  </span>
                </div>
                <div className="text-lg font-bold text-white">
                  {loading ? (
                    <div className="flex justify-center">
                      <LoadingSpinner size="sm" />
                    </div>
                  ) : (
                    truncateDecimals(userInfo?.usdt_points || 0)
                  )}
                </div>
              </div>
            </div>
          </BorderCustom>

          {/* Action Buttons Section */}
          <div className="mb-3">
            <div className="flex flex-col space-y-3">
              {/* Top Row */}
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    if (!address) {
                      triggerWalletConnect();
                      return;
                    }
                    setWithdrawError("");
                    setTransferMode("cashout");
                    setShowCashOutModal(true);
                  }}
                  className="flex-1  text-black py-3 px-4 rounded-lg font-bold text-center"
                  style={{
                    WebkitTapHighlightColor: "transparent",
                    background:
                      "linear-gradient(270deg, #2563EB 0%, #60A5FA 100%)",
                  }}
                >
                  {t("cash_out")}
                </button>
                <button
                  onClick={() => {
                    if (!address) {
                      triggerWalletConnect();
                      return;
                    }
                    setWithdrawError("");
                    setShowFlashSwapModal(true);
                  }}
                  className="flex-1 text-black py-3 px-4 rounded-lg font-bold text-center"
                  style={{
                    WebkitTapHighlightColor: "transparent",
                    background:
                      "linear-gradient(270deg, #2563EB 0%, #60A5FA 100%)",
                  }}
                >
                  {t("flash_swap")}
                </button>
              </div>
              {/* Bottom Row */}
              <button
                onClick={() => {
                  if (!address) {
                    triggerWalletConnect();
                    console.log("address", address);
                    return;
                  }
                  setShowQRModal(true);
                  console.log("1address", address);

                  // Add invite friends functionality here
                }}
                className="w-full text-black py-3 px-4 rounded-lg font-bold text-center flex items-center justify-center"
                style={{
                  WebkitTapHighlightColor: "transparent",
                  background:
                    "linear-gradient(270deg, #2563EB 0%, #60A5FA 100%)",
                }}
              >
                <Image
                  src="/images/v2/my/invite.png"
                  alt="Invite"
                  width={17}
                  height={14}
                  className="mr-1"
                />
                {t("invite_friends")}
              </button>
            </div>
          </div>

          {/* Navigation List Section */}
          {/* My Inviter with Input Field */}
          <div
            className="flex justify-between items-center py-3 border-b  cursor-pointer"
            style={{
              borderBottom: "1px solid rgba(59, 130, 246, 0.5)",
            }}
            onClick={() => {
              if (!address) {
                triggerWalletConnect();
                return;
              }
              // 如果有推荐人代码，不弹窗
              if (userInfo?.superior_referral_code) {
                return;
              }
              setRecommenderError("");
              setShowRecommenderModal(true);
            }}
          >
            <span className="text-white text-sm font-semibold">
              {t("my_recommender")}
            </span>
            <div
              className="flex items-center"
              style={{
                border: "1px solid rgba(59, 130, 246, 0.3)",
              }}
            >
              <input
                type="text"
                placeholder={
                  userInfo?.superior_referral_code
                    ? userInfo.superior_referral_code
                    : t("enter_invite_code")
                }
                value={userInfo?.superior_referral_code || ""}
                className="bg-transparent text-white text-sm border-none outline-none w-24 text-right py-1"
                readOnly
              />
            </div>
          </div>

          {/* Other Menu Items */}
          {[
            {
              key: "invite_records",
              label: t("invite_records"),
              href: "/my/invites",
            },
            {
              key: "my_community",
              label: t("my_community"),
              href: "/my/community",
            },
            { key: "my_minting", label: t("my_minting"), href: "/my/burning" },
            {
              key: "my_withdrawals",
              label: t("my_withdrawals"),
              href: "/my/withdrawals",
            },
            {
              key: "announcements",
              label: t("announcements"),
              href: "/my/proclaim",
            },
          ].map((item, index) => (
            <Link href={item.href} key={item.key}>
              <div
                className="flex justify-between items-center py-3 border-b  last:border-b-0"
                style={{
                  borderBottom: "1px solid rgba(59, 130, 246, 0.5)",
                }}
              >
                <span className="text-white text-sm font-semibold">
                  {item.label}
                </span>
                <svg
                  className="w-5 h-5 text-blue-500"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            </Link>
          ))}

          {/* Version */}
          <div className="flex justify-between items-center py-3 ">
            <span className="text-white text-sm font-semibold">
              {t("version_number")}
            </span>
            <span className="text-[#3B82F6] font-semibold">{version}</span>
          </div>

          {/* Copied Notification Modal */}
          {showCopiedNotification && (
            <div className="fixed inset-0 flex items-center justify-center z-[60]">
              <div className="bg-[#1A1A1A] py-3 px-6 rounded-xl border border-[#0066CC] shadow-lg">
                <p className="text-[#50C8FF] text-center font-bold">
                  {t("copy_success")}
                </p>
              </div>
            </div>
          )}

          {/* Cash Out Modal */}
          {showCashOutModal && (
            <div
              style={{
                background: "rgba(0, 0, 0, 0.95)",
              }}
              className="fixed inset-0  flex items-center justify-center z-50"
              onClick={(e) => {
                // Close if clicking outside the modal content
                if (e.target === e.currentTarget) {
                  setShowCashOutModal(false);
                }
              }}
            >
              <div
                style={{
                  background: "rgba(59, 130, 246, 0.4)",
                }}
                className="p-2 rounded-xl w-[95%] relative border-2 border-blue-500"
              >
                {/* Withdrawal Address Section */}
                <div className="text-center text-white font-bold mb-2 text-lg">
                  {t("withdrawal")}
                </div>
                <div className="mb-6">
                  <h3
                    className=" text-sm font-medium mb-2"
                    style={{ color: "rgba(255, 255, 255, 0.6)" }}
                  >
                    {t("destination")}
                  </h3>
                  <div
                    style={{ background: "rgba(255, 255, 255, 0.4)" }}
                    className=" rounded-lg p-1"
                  >
                    <textarea
                      value={toAddress}
                      onChange={(e) => setToAddress(e.target.value)}
                      placeholder="Enter wallet address"
                      className="w-full bg-transparent  outline-none border-none focus:ring-0 text-sm resize-none"
                      rows={2}
                      style={{
                        whiteSpace: "pre-wrap",
                        color: "rgba(255, 255, 255, 0.6)",
                      }}
                    />
                  </div>
                </div>

                {/* Transfer Amount Section */}
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <h3
                      className=" text-sm font-medium"
                      style={{ color: "rgba(255, 255, 255, 0.6)" }}
                    >
                      {t("amount")}
                    </h3>
                    <div
                      className="flex items-center cursor-pointer"
                      onClick={() =>
                        setShowTokenTypeDropdown(!showTokenTypeDropdown)
                      }
                    >
                      <span className="mr-2 text-white">
                        {cashOutTokenType}
                      </span>
                      <svg
                        className="h-5 w-5 text-white"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  </div>

                  {/* Dropdown menu */}
                  {showTokenTypeDropdown && (
                    <div className="absolute z-10 right-10 mt-1 bg-black border border-blue-500/30 rounded-lg shadow-lg overflow-hidden w-36">
                      <div
                        className={`p-3 cursor-pointer hover:bg-blue-500/20 text-white ${cashOutTokenType === TokenType.USDT
                            ? "bg-blue-500/20"
                            : ""
                          }`}
                        onClick={() => {
                          setCashOutTokenType(TokenType.USDT);
                          setCashOutAmount("0.00");
                          setShowTokenTypeDropdown(false);
                        }}
                      >
                        USDT
                      </div>
                      <div
                        className={`p-3 cursor-pointer hover:bg-blue-500/20 text-white ${cashOutTokenType === TokenType.TXT
                            ? "bg-blue-500/20"
                            : ""
                          }`}
                        onClick={() => {
                          setCashOutTokenType(TokenType.TXT);
                          setCashOutAmount("0.00");
                          setShowTokenTypeDropdown(false);
                        }}
                      >
                        TXT
                      </div>
                    </div>
                  )}
                  <div
                    style={{ background: "rgba(255, 255, 255, 0.4)" }}
                    className="rounded-lg px-1 py-3"
                  >
                    <div
                      className="relative pb-2"
                      style={{
                        borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                      }}
                    >
                      <input
                        value={cashOutAmount}
                        onChange={(e) => {
                          const value = e.target.value;
                          // 只允许输入数字和一个小数点
                          if (!/^\d*\.?\d*$/.test(value) && value !== "")
                            return;

                          const maxAmount =
                            transferMode === "internal"
                              ? cashOutTokenType === TokenType.USDT
                                ? userInfo?.usdt_points
                                : userInfo?.token_points
                              : cashOutTokenType === TokenType.USDT
                                ? userInfo?.usdt_points
                                : userInfo?.token_points;
                          if (maxAmount !== undefined && value !== "") {
                            const numValue = parseFloat(value);
                            if (isNaN(numValue)) {
                              setCashOutAmount("");
                            } else if (numValue > maxAmount) {
                              setCashOutAmount(truncateDecimals(maxAmount));
                            } else {
                              // 限制小数点后最多2位
                              const parts = value.split(".");
                              if (parts[1] && parts[1].length > 2) {
                                setCashOutAmount(
                                  `${parts[0]}.${parts[1].slice(0, 2)}`
                                );
                              } else {
                                setCashOutAmount(value);
                              }
                            }
                          } else {
                            setCashOutAmount(value);
                          }
                        }}
                        placeholder="0.00"
                        className="w-full bg-transparent text-white outline-none text-left border-none focus:ring-0 h-8 text-2xl"
                      />
                      <button
                        onClick={() => {
                          if (!userInfo) return;
                          let maxAmount =
                            (cashOutTokenType === TokenType.USDT
                              ? userInfo?.usdt_points
                              : userInfo?.token_points) || 0;
                          if (transferMode === "internal") {
                            maxAmount =
                              (cashOutTokenType === TokenType.USDT
                                ? userInfo?.usdt_points
                                : userInfo?.token_points) || 0;
                          }
                          if (maxAmount !== undefined && maxAmount > 0) {
                            setCashOutAmount(truncateDecimalsStr(maxAmount));
                          }
                        }}
                        className="absolute right-2 top-[2px] rounded-[20px]  bg-[#60A5FA] text-[#050505] w-[52px] h-[28px] rounded-md text-sm"
                      >
                        {t("token_all")}
                      </button>
                    </div>
                    <div className="flex justify-between items-center mt-2 text-sm text-white px-2">
                      <span>{t("token_withdrawable")}</span>
                      <span>
                        {transferMode === "cashout"
                          ? cashOutTokenType === TokenType.USDT
                            ? userInfo
                              ? `${truncateDecimals(
                                Number(userInfo.usdt_points || 0)
                              )} USDT`
                              : "0.00 USDT"
                            : userInfo
                              ? `${truncateDecimals(
                                Number(userInfo.token_points || 0)
                              )} TXT`
                              : "0.00 TXT"
                          : cashOutTokenType === TokenType.USDT
                            ? userInfo
                              ? `${truncateDecimals(
                                Number(userInfo.usdt_points || 0)
                              )} USDT`
                              : "0.00 USDT"
                            : userInfo
                              ? `${truncateDecimals(
                                Number(userInfo.token_points || 0)
                              )} TXT`
                              : "0.00 TXT"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Fees Section - Only shown in cash out mode */}
                {transferMode === "cashout" && (
                  <div className="mb-6">
                    <h3
                      className="text-white text-sm font-medium mb-2"
                      style={{ color: "rgba(255, 255, 255, 0.6)" }}
                    >
                      {t("token_fees")}
                    </h3>
                    <div
                      style={{ background: "rgba(255, 255, 255, 0.4)" }}
                      className="rounded-lg p-1"
                    >
                      <div className="flex justify-between items-center">
                        <span
                          className="text-white text-sm"
                          style={{ color: "rgba(255, 255, 255, 0.6)" }}
                        >
                          {t("minimum_withdrawal")}
                        </span>
                        <span
                          className="text-white text-xs"
                          style={{ color: "rgba(255, 255, 255, 0.6)" }}
                        >
                          {cashOutTokenType === TokenType.TXT
                            ? `${minCashOutAmountToken} TXT(Fee: ~${withdrawTokenFeeRatio * 100
                            }%)`
                            : `${minCashOutAmountUsdt} USDT(Fee: ~${withdrawTokenFeeRatio * 100
                            }%)`}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {withdrawError && (
                  <p className="text-red-500 mt-2">{withdrawError}</p>
                )}
                {withdrawResult && (
                  <p className="text-green-500 text-center mt-2">
                    {withdrawResult}
                  </p>
                )}

                {/* Buttons */}
                <div
                  className="flex flex-col justify-center items-center text-xs text-white"
                  style={{ color: "rgba(255, 255, 255, 0.6)" }}
                >
                  <span>{t("network_fee_note")}</span>
                  <span>{t("deposit_time_note")}</span>
                </div>
                <div className="flex w-full gap-4">
                  {/* <button
                    onClick={() => {
                      setShowCashOutModal(false);
                      setWithdrawResult("");
                      setWithdrawError("");
                    }}
                    className="flex-1 bg-gray-800 text-white py-3 px-4 rounded-lg font-medium hover:bg-gray-700 transition-colors"
                  >
                    {t("cancel")}
                  </button> */}
                  <button
                    onClick={async () => {
                      if (isWithdrawing) return;

                      let minAmount =
                        cashOutTokenType === TokenType.TXT
                          ? minCashOutAmountToken
                          : minCashOutAmountUsdt;
                      if (transferMode === "internal") {
                        minAmount = 0;
                      }

                      if (
                        parseFloat(cashOutAmount) < minAmount ||
                        parseFloat(cashOutAmount) <= 0
                      ) {
                        setWithdrawError(tErrors(ErrorCode.INVALID_AMOUNT));
                        return;
                      }
                      setWithdrawResult("");
                      setWithdrawError("");
                      setIsWithdrawing(true);
                      try {
                        // Handle cash out logic here
                        //setShowCashOutModal(false);
                        await handleWithdrawPoints();
                      } finally {
                        setCashOutAmount("0.00");
                        setIsWithdrawing(false);
                        setTimeout(() => {
                          setShowCashOutModal(false);
                          setWithdrawResult("");
                          setWithdrawError("");
                        }, 1000);
                      }
                    }}
                    className={`flex-1 text-black py-3 px-4 rounded-lg font-medium transition-colors mt-10 ${isWithdrawing ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                    style={{
                      background:
                        "linear-gradient(270deg, #2563EB 0%, #60A5FA 100%)",
                    }}
                    disabled={isWithdrawing}
                  >
                    {t("confirm")}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Recommender Modal */}
          {showRecommenderModal && (
            <div
              className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
              onClick={(e) => {
                // Close if clicking outside the modal content
                if (e.target === e.currentTarget) {
                  setShowRecommenderModal(false);
                }
              }}
            >
              <div
                className="bg-black p-2 rounded-xl w-[90%] max-w-md border-2 border-blue-500"
                style={{ boxShadow: "0 0 30px rgba(59, 130, 246, 0.6)" }}
              >
                <h3 className="text-lg font-bold mb-2 text-[#3B82F6] text-center">
                  {t("enter_invite_code")}
                </h3>

                <div className="flex flex-col gap-2">
                  <input
                    type="text"
                    value={superiorReferralCode || ""}
                    onChange={(e) => setSuperiorReferralCode(e.target.value)}
                    placeholder={t("please_enter_invite_code")}
                    className="w-full bg-gray-800 text-white rounded-lg p-3 text-center text-2xl font-bold "
                  />
                  <p className="text-red-500 text-sm mt-1 text-center">
                    {t("please_enter_invite_code")}
                  </p>

                  <div className="flex w-full gap-4">
                    <button
                      onClick={() => {
                        setShowRecommenderModal(false);
                        setSuperiorReferralCode("");
                        setRecommenderError(null);
                      }}
                      className="flex-1 bg-gray-800 text-white py-3 px-4 rounded-lg font-medium hover:bg-gray-700 transition-colors"
                    >
                      {t("cancel")}
                    </button>
                    <button
                      onClick={() => {
                        setShowRecommenderModal(false);
                        setShowRecommenderConfirmModal(true);
                      }}
                      style={{
                        background:
                          "linear-gradient(270deg, #2563EB 0%, #60A5FA 100%)",
                      }}
                      className="flex-1 text-black py-3 px-4 rounded-lg font-medium hover:bg-blue-600 transition-colors"
                    >
                      {t("ok")}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Recommender Confirm Modal */}
          <RecommenderModal
            isOpen={showRecommenderConfirmModal}
            onClose={() => setShowRecommenderConfirmModal(false)}
            initialReferralCode={superiorReferralCode}
          />

          {/* Flash Swap Modal */}
          {showFlashSwapModal && (
            <div
              className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
              onClick={(e) => {
                // Close if clicking outside the modal content
                if (e.target === e.currentTarget) {
                  setShowFlashSwapModal(false);
                }
              }}
            >
              <div
                className="bg-black p-6 rounded-xl w-[95%] relative border-2 border-blue-500"
                style={{
                  boxShadow: "0 0 30px rgba(59, 130, 246, 0.6)",
                }}
              >
                <div className="text-center text-white font-bold mb-2 text-lg">
                  {t("flash_swap")}
                </div>

                {/* TXT Input Section */}
                <div className="mb-6">
                  <h3
                    className=" text-sm font-medium mb-2"
                    style={{ color: "rgba(255, 255, 255, 0.6)" }}
                  >
                    {t("token_amount")}
                  </h3>
                  <div
                    style={{ background: "rgba(255, 255, 255, 0.4)" }}
                    className=" rounded-lg p-1"
                  >
                    <textarea
                      value={cashOutAmount}
                      onChange={(e) => {
                        const value = e.target.value;
                        // Only allow numbers and one decimal point
                        if (!/^\d*\.?\d*$/.test(value) && value !== "") return;

                        // Limit to 2 decimal places
                        const parts = value.split(".");
                        if (parts[1] && parts[1].length > 2) {
                          setCashOutAmount(
                            `${parts[0]}.${parts[1].slice(0, 2)}`
                          );
                        } else {
                          setCashOutAmount(value);
                        }

                        // Clear any previous errors when input changes
                        setWithdrawError("");
                      }}
                      placeholder="0.00"
                      className="w-full bg-transparent  outline-none border-none focus:ring-0 text-sm resize-none"
                      rows={1}
                      style={{
                        whiteSpace: "pre-wrap",
                        color: "rgba(255, 255, 255, 0.6)",
                      }}
                    />
                  </div>
                  <div className="flex justify-between items-center mt-2 text-sm text-white px-2">
                    <span>{t("token_withdrawable")}</span>
                    <span>
                      {userInfo
                        ? `${truncateDecimals(
                          Number(userInfo.token_points || 0)
                        )} TXT`
                        : "0.00 TXT"}
                    </span>
                  </div>
                </div>

                {/* USDT Output Section */}
                <div className="mb-6">
                  <h3
                    className=" text-sm font-medium mb-2"
                    style={{ color: "rgba(255, 255, 255, 0.6)" }}
                  >
                    {t("usdt_amount")}
                  </h3>
                  <div
                    style={{ background: "rgba(255, 255, 255, 0.4)" }}
                    className=" rounded-lg p-1"
                  >
                    <textarea
                      value={
                        parseFloat(cashOutAmount) > 0
                          ? truncateDecimals(
                            parseFloat(cashOutAmount) * tokenPrice
                          )
                          : "0.00"
                      }
                      readOnly
                      className="w-full bg-transparent  outline-none border-none focus:ring-0 text-sm resize-none"
                      rows={1}
                      style={{
                        whiteSpace: "pre-wrap",
                        color: "rgba(255, 255, 255, 0.6)",
                      }}
                    />
                  </div>
                  <div className="flex justify-between items-center mt-2 text-sm text-white px-2">
                    <span>{t("current_price")}</span>
                    <span>1 TXT = {truncateDecimals(tokenPrice)} USDT</span>
                  </div>
                </div>

                {withdrawError && (
                  <p className="text-red-500 mt-2">{withdrawError}</p>
                )}
                {withdrawResult && (
                  <p className="text-green-500 text-center mt-2">
                    {withdrawResult}
                  </p>
                )}

                {/* Buttons */}
                <div className="flex w-full gap-4">
                  <button
                    onClick={() => {
                      setShowFlashSwapModal(false);
                      setWithdrawResult("");
                      setWithdrawError("");
                      setCashOutAmount("0.00");
                    }}
                    className="flex-1 bg-gray-800 text-white py-3 px-4 rounded-lg font-medium hover:bg-gray-700 transition-colors"
                  >
                    {t("cancel")}
                  </button>
                  <button
                    onClick={handleFlashSwap}
                    className={`flex-1 text-white py-3 px-4 rounded-lg font-medium transition-colors ${isWithdrawing ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                    style={{
                      background:
                        "linear-gradient(270deg, #2563EB 0%, #60A5FA 100%)",
                    }}
                    disabled={isWithdrawing}
                  >
                    {t("confirm")}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      {/* QR Code Modal */}
      {showQRModal && address && (
        <QRCodeModal
          isOpen={showQRModal}
          onClose={() => setShowQRModal(false)}
          publicKey={address?.toString()}
          userType={userInfo?.type}
        />
      )}
    </div>
  );
}

export default function MyPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <MyContent />
    </div>
  );
}
