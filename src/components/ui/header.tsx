import Logo from "./logo";
import ConnectWallet from "@/components/connect-wallet";
import Image from "next/image";
import globeIcon from "@/public/images/globe-icon.svg";
import gridIcon from "@/public/images/grid-icon.svg";
import LanguageSelector from "./language-selector";
import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { QRCodeModal } from "./qr-code-modal";
import { RecommenderModal } from "./recommender-modal";
import {
  useWalletRef,
  triggerWalletConnect,
  useWalletConnector,
} from "./wallet-ref";
import { useAppKitAccount } from "@reown/appkit/react";
import { useSearchParams } from "next/navigation";

/**
 * Header component for the application.
 *
 * This component renders the header at the top of every page. It includes:
 * - Site branding (logo)
 * - Desktop navigation menu
 * - Desktop theme toggle
 * - Desktop call-to-action (CTA)
 * - Mobile menu toggle
 *
 * @returns {JSX.Element} The header component.
 */
export default function Header() {
  const [showQRModal, setShowQRModal] = useState(false);
  const { address } = useAppKitAccount();
  const t = useTranslations();
  const walletRef = useWalletRef();
  const [userType, setUserType] = useState<string | null>(null);

  const searchParams = useSearchParams();
  const [showRecommenderModal, setShowRecommenderModal] = useState(false);
  const [referralCodeFromUrl, setReferralCodeFromUrl] = useState("");

  useEffect(() => {
    const fetchUserInfo = async () => {
      if (!address) {
        setUserType(null);
        return;
      }
      try {
        const response = await fetch(`/api/user/info?address=${address}`);
        if (!response.ok) {
          setUserType(null);
          return;
        }
        const data = await response.json();
        setUserType(data?.type || null);
        const referralCode = searchParams.get("ref");
        if (referralCode && !data.superior) {
          setReferralCodeFromUrl(referralCode);

          // Add 500ms delay before showing the modal
          setTimeout(() => {
            setShowRecommenderModal(true);
          }, 1000);
        }
      } catch {
        setUserType(null);
      }
    };
    fetchUserInfo();
  }, [address]);

  return (
    <header className="absolute w-full z-30">
      <div className="max-w-[1900px] mx-auto px-4 sm:px-6 lg:px-8 2xl:px-16">
        <div className="flex items-center justify-between h-36">
          {/* Site branding and icons */}
          <div className="flex-1 flex items-center min-w-0 ">
            <div className="shrink-0 mr-auto">
              <Logo />
            </div>
          </div>

          <div className="flex-shrink-0 flex flex-col" ref={walletRef}>
            <div className="flex items-center space-x-5 justify-end  sm:mr-6 md:mr-8 mb-2">
              <div className="w-6 h-6 cursor-pointer relative">
                <Image
                  src={gridIcon}
                  alt={t("qr_code.grid_icon_alt")}
                  width={20}
                  height={20}
                  onClick={() => {
                    if (!address) {
                      triggerWalletConnect();
                      return;
                    }
                    setShowQRModal((prev) => !prev);
                  }}
                />
              </div>
              <div className="w-6 h-6 cursor-pointer">
                <LanguageSelector />
              </div>
            </div>
            <ConnectWallet size="small" />
          </div>
        </div>
      </div>

      {/* Recommender Modal */}
      <RecommenderModal
        isOpen={showRecommenderModal}
        onClose={() => setShowRecommenderModal(false)}
        initialReferralCode={referralCodeFromUrl}
      />

      {/* QR Code Modal */}
      <QRCodeModal
        isOpen={showQRModal}
        onClose={() => setShowQRModal(false)}
        publicKey={address}
        userType={userType}
      />
    </header>
  );
}
