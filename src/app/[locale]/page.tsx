"use client";

import Image from "next/image";
import LoadingSpinner from "@/components/LoadingSpinner";
import { Suspense, useState, useEffect } from "react";
import React from "react";
import { useLocale, useTranslations } from "next-intl";
import { RoadmapItem } from "@/components/ui/roadmap-item";
import BorderCustom from "@/components/ui/border-custom";
import { useRouter } from "next/navigation";

interface Proclamation {
  index: number;
  title: string;
  content: string;
  updated_at: string;
  picture: string;
}

// Carousel indicator component
const CarouselIndicator = ({
  active,
  total,
  onSelect,
}: {
  active: number;
  total: number;
  onSelect: (index: number) => void;
}) => {
  return (
    <div className="flex justify-center space-x-2 mt-4">
      {Array.from({ length: total }).map((_, index) => (
        <button
          key={index}
          onClick={() => onSelect(index)}
          className={`w-2 h-2 rounded-full transition-all ${active === index ? "bg-purple-500 w-4" : "bg-gray-400"
            }`}
          aria-label={`Go to slide ${index + 1}`}
        />
      ))}
    </div>
  );
};

const getSystemList = (t: any) => [
  {
    img: "/images/v2/home/sys1.png",
    title: t("app_ecosystem.items.0.title"),
  },
  {
    img: "/images/v2/home/sys2.png",
    title: t("app_ecosystem.items.1.title"),
  },
  {
    img: "/images/v2/home/sys3.png",
    title: t("app_ecosystem.items.2.title"),
  },
  {
    img: "/images/v2/home/sys4.png",
    title: t("app_ecosystem.items.3.title"),
  },
];

const getRoadmapList = (t: any) => [
  {
    img: "/images/v2/home/timeline1.png",
    title: t("roadmap.phase1.date"),
    desc: t("roadmap.phase1.title"),
  },
  {
    img: "/images/v2/home/timeline2.png",
    title: t("roadmap.phase2.date"),
    desc: t("roadmap.phase2.title"),
  },
  {
    img: "/images/v2/home/timeline3.png",
    title: t("roadmap.phase3.date"),
    desc: t("roadmap.phase3.title"),
  },
  {
    img: "/images/v2/home/timeline4.png",
    title: t("roadmap.phase4.date"),
    desc: t("roadmap.phase4.title"),
  },
  {
    img: "/images/v2/home/timeline5.png",
    title: t("roadmap.phase5.date"),
    desc: t("roadmap.phase5.title"),
  },
  {
    img: "/images/v2/home/timeline6.png",
    title: t("roadmap.phase6.date"),
    desc: t("roadmap.phase6.title"),
  },
];

// List of locales that have custom banner folders
const LOCALES_WITH_CUSTOM_BANNERS = ["zh"];

// Function to get the banner image path based on locale
function getBannerPath(index: number, locale: string): string {
  if (LOCALES_WITH_CUSTOM_BANNERS.includes(locale)) {
    return `/images/banner-${locale}/banner-${index + 1}.png`;
  }
  return `/images/banner/banner-${index + 1}.png`;
}

function UserContent() {
  const router = useRouter();
  const [activeSlide, setActiveSlide] = useState(0);
  const totalSlides = 4; // Number of carousel slides

  // Redirect to /node page on component mount while preserving URL parameters
  useEffect(() => {
    // Get the current URL search parameters
    const searchParams = new URLSearchParams(window.location.search);
    // Create the target URL with preserved parameters
    const targetUrl = searchParams.toString()
      ? `/node?${searchParams.toString()}`
      : "/node";
    // router.push(targetUrl);
  }, [router]);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveSlide((prevSlide) => (prevSlide + 1) % totalSlides);
    }, 5000); // Change slide every 5 seconds

    return () => clearInterval(interval); // Cleanup on unmount
  }, [totalSlides]);
  const t = useTranslations("home");
  const [totalStaking, setTotalStaking] = useState("0");
  const [levelCounts, setLevelCounts] = useState<
    { level: number; count: number }[]
  >([]);
  const [proclaims, setProclaims] = useState<Proclamation[]>([]);
  const locale = useLocale();

  useEffect(() => {
    const fetchProclaim = async () => {
      try {
        const response = await fetch("/api/info/proclaims", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            locale: locale,
          }),
        });
        const data = await response.json();
        if (data.proclamation !== null && data.proclamation !== undefined) {
          setProclaims(data.proclamation);
        }
      } catch (error) {
        console.error("Error fetching proclaim info:", error);
      }
    };
    const fetchTotalStaking = async () => {
      try {
        const response = await fetch("/api/info/stake", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        });
        const data = await response.json();
        if (data.total !== null && data.total !== undefined) {
          const formattedNumber =
            data.total === 0
              ? "0"
              : data.total.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
          setTotalStaking(formattedNumber);
        }
      } catch (error) {
        console.error("Error fetching total staking:", error);
      }
    };

    const fetchLevelCounts = async () => {
      try {
        const response = await fetch("/api/info/level", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        });
        const data = await response.json();
        setLevelCounts(data);
      } catch (error) {
        console.error("Error fetching level counts:", error);
      }
    };

    //fetchTotalStaking();
    fetchLevelCounts();
    fetchProclaim();
  }, []);

  // Calculate the height multiplier based on the maximum count
  const maxCount = Math.max(...levelCounts.map((l) => l.count), 6); // Minimum height of 100
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 pb-16 pt-24">
        <div className="p-4">
          {/* <Image
            src="/images/v2/home/banner.png"
            alt="banner"
            width={400}
            height={182}
            className="w-full h-[182px]"
          /> */}
          <div className="relative w-full h-[200px] overflow-hidden rounded-xl">
            {/* Carousel content */}
            <div className="relative h-full w-full cursor-pointer">
              {Array.from({ length: totalSlides }).map((_, index) => (
                <div
                  key={index}
                  className={`absolute inset-0 flex items-start justify-center text-white transition-opacity duration-500 ${
                    activeSlide === index ? "opacity-100" : "opacity-0"
                  }`}
                  onClick={() => {
                    const matchingProclaim = proclaims.find(
                      (p) => p.picture === `banner-${activeSlide + 1}.png`
                    );
                    if (matchingProclaim) {
                      router.push(
                        `/${locale}/my/proclaim/${matchingProclaim.index}`
                      );
                    }
                  }}
                >
                  <div className="text-center w-full h-[180px] relative">
                    {/* Skull Logo */}
                    <Image
                      src={getBannerPath(index, locale)}
                      alt={`Banner ${index + 1}`}
                      fill
                      className="object-contain w-full h-full"
                      priority
                    />
                  </div>
                </div>
              ))}

              {/* Electric effect elements */}
              {/* <div className="absolute top-10 right-10 w-16 h-24 bg-green-500 opacity-30 transform rotate-45"></div> */}
              {/* <div className="absolute bottom-10 left-10 w-20 h-8 bg-purple-500 opacity-30 transform -rotate-12"></div> */}
              {/* <div className="absolute top-1/3 left-1/4 w-10 h-10 bg-blue-500 opacity-20 transform rotate-12"></div> */}
            </div>

            {/* Carousel indicators */}
            <div className="absolute bottom-12 w-full">
              <CarouselIndicator
                active={activeSlide}
                total={totalSlides}
                onSelect={setActiveSlide}
              />
            </div>

            {/* Greeting bar with marquee effect - positioned at the bottom of the banner */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-r from-blue-300 to-blue-500 px-4 py-1 overflow-hidden min-h-[28px]">
              <div className="animate-marquee whitespace-nowrap flex items-center">
                {proclaims.map((proclaim, index) => (
                  <span
                    key={index}
                    className={`text-white text-sm flex items-center ${
                      index > 0 ? "mx-8" : ""
                    }`}
                    onClick={() =>
                      router.push("/my/proclaim/" + proclaim.index)
                    }
                  >
                    <Image
                      src="/images/icons/volume-up.svg"
                      alt="Volume Icon"
                      width={20}
                      height={20}
                      className="mr-1"
                    />
                    {proclaim.title}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="flex items-center my-3">
            <div className="w-[4px] h-[13px] bg-[#0066CC] mr-1 "></div>
            <span className="text-[#E6F0FF] font-bold text-sm">
              {t("project_intro.title")}
            </span>
          </div>
          <BorderCustom
            className="mt-2"
            style={{
              border: "1px solid rgba(0, 102, 204, 0.3)",
              padding: "12px",
              fontSize: "12px",
              lineHeight: "20px",
              color: "rgba(255, 255, 255, 0.8)",
            }}
          >
            {t("project_intro.description")}
          </BorderCustom>
          <div className="flex items-center my-3">
            <div className="w-[4px] h-[13px] bg-[#0066CC] mr-1 "></div>
            <span className="text-[#E6F0FF] font-bold text-sm">
              {t("app_ecosystem.title")}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {getSystemList(t).map((item, index) => (
              <BorderCustom
                key={index}
                style={{
                  padding: "10px",
                  border: "1px solid rgba(0, 102, 204, 0.3)",
                }}
              >
                <Image
                  src={item.img}
                  alt={item.title}
                  width={144}
                  height={122}
                  className="w-[144px] h-[122px]"
                />
                <div className="text-[#66B2FF] font-bold  text-center text-xs mt-1">
                  {item.title}
                </div>
              </BorderCustom>
            ))}
          </div>
          <div className="flex items-center mt-4">
            <div className="w-[4px] h-[13px] bg-[#0066CC] mr-1 "></div>
            <span className="text-[#E6F0FF] font-bold text-sm">
              {t("roadmap.title")}
            </span>
          </div>

          {/* {t("roadmap_content")} */}
          <div className="mt-2 relative">
            {/* {t("timeline_vertical_line")} */}
            <div
              style={{
                position: "absolute",
                left: "23px",
                top: "38px",
                bottom: "38px",
                width: "2px",
                background: "rgba(0, 102, 204, 0.3)",
                zIndex: 1,
              }}
            ></div>

            <div className="space-y-4">
              {getRoadmapList(t).map((item, index) => (
                <div
                  key={index}
                  className="relative flex items-center"
                  style={{ paddingLeft: "50px" }}
                >
                  {/* {t("timeline_node")} */}
                  <div
                    style={{
                      position: "absolute",
                      left: "20px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      width: "8px",
                      height: "8px",
                      background: "#0066CC",
                      borderRadius: "50%",
                      zIndex: 2,
                    }}
                  ></div>

                  <BorderCustom
                    style={{
                      border: "1px solid rgba(0, 102, 204, 0.3)",
                      padding: "4px",
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      width: "100%",
                    }}
                  >
                    <Image
                      src={item.img}
                      alt={item.title}
                      width={60}
                      height={60}
                      className="w-[60px] h-[60px] object-contain"
                    />
                    <div>
                      <div
                        className={`${index === 0 ? "text-[#0066CC]" : "text-[#66B2FF]"
                          } text-sm font-bold mb-1`}
                      >
                        {item.title}
                      </div>
                      <div className="text-white text-xs">{item.desc}</div>
                    </div>
                  </BorderCustom>
                </div>
              ))}
            </div>
          </div>

          {/* 合作伙伴部分 */}
          <div className="flex items-center mt-6">
            <div className="w-[4px] h-[13px] bg-[#0066CC] mr-1 "></div>
            <span className="text-[#E6F0FF] font-bold text-sm">
              {t("partners")}
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2 mt-4">
            {[
              { name: "Binance", logo: "/images/v2/home/partner1.png" },
              { name: "Chain Catcher", logo: "/images/v2/home/partner2.png" },
              { name: "Odaily", logo: "/images/v2/home/partner3.png" },
              { name: "Arbitrum", logo: "/images/v2/home/partner4.png" },
              { name: "Chainlink", logo: "/images/v2/home/partner5.png" },
              { name: "StarkWare", logo: "/images/v2/home/partner6.png" },
              { name: "Curve", logo: "/images/v2/home/partner7.png" },
              { name: "Uniswap", logo: "/images/v2/home/partner8.png" },
              { name: "Optimism", logo: "/images/v2/home/partner9.png" },
              { name: "MetaMask", logo: "/images/v2/home/partner10.png" },
              { name: "Aave", logo: "/images/v2/home/partner11.png" },
              { name: "GMX", logo: "/images/v2/home/partner12.png" },
              { name: "Gate.io", logo: "/images/v2/home/partner13.png" },
              { name: "Cointelegraph", logo: "/images/v2/home/partner14.png" },
              { name: "feixiaohao", logo: "/images/v2/home/partner15.png" },
              { name: "Sei", logo: "/images/v2/home/partner16.png" },
            ].map((partner, index) => (
              <div
                key={index}
                style={{
                  border: "1px solid rgba(0, 102, 204, 0.3)",
                  borderRadius: "4px",
                  padding: "4px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Image
                  src={partner.logo}
                  alt={partner.name}
                  width={65}
                  height={20}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      {/* Main content area with bottom padding for nav and top padding for header */}
      <div className="flex-1 pb-16 pt-16">
        <div className="p-4 bg-black text-white">
          {/* Hero section with carousel - now with same width as cards */}
          <div className="relative w-full h-[200px] overflow-hidden rounded-xl">
            {/* Carousel content */}
            <div className="relative h-full w-full cursor-pointer">
              {Array.from({ length: totalSlides }).map((_, index) => (
                <div
                  key={index}
                  className={`absolute inset-0 flex items-start justify-center text-white transition-opacity duration-500 ${
                    activeSlide === index ? "opacity-100" : "opacity-0"
                  }`}
                  onClick={() => {
                    const matchingProclaim = proclaims.find(
                      (p) => p.picture === `banner-${activeSlide + 1}.png`
                    );
                    if (matchingProclaim) {
                      router.push(
                        `/${locale}/my/proclaim/${matchingProclaim.index}`
                      );
                    }
                  }}
                >
                  <div className="text-center w-full h-[180px] relative">
                    {/* Skull Logo */}
                    <Image
                      src={getBannerPath(index, locale)}
                      alt={`Banner ${index + 1}`}
                      fill
                      className="object-contain w-full h-full"
                      priority
                    />
                  </div>
                </div>
              ))}

              {/* Electric effect elements */}
              {/* <div className="absolute top-10 right-10 w-16 h-24 bg-green-500 opacity-30 transform rotate-45"></div> */}
              {/* <div className="absolute bottom-10 left-10 w-20 h-8 bg-purple-500 opacity-30 transform -rotate-12"></div> */}
              {/* <div className="absolute top-1/3 left-1/4 w-10 h-10 bg-blue-500 opacity-20 transform rotate-12"></div> */}
            </div>

            {/* Carousel indicators */}
            <div className="absolute bottom-12 w-full">
              <CarouselIndicator
                active={activeSlide}
                total={totalSlides}
                onSelect={setActiveSlide}
              />
            </div>

            {/* Greeting bar with marquee effect - positioned at the bottom of the banner */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-r from-orange-500 to-orange-400 px-4 py-1 overflow-hidden min-h-[28px]">
              <div className="animate-marquee whitespace-nowrap flex items-center">
                {proclaims.map((proclaim, index) => (
                  <span
                    key={index}
                    className={`text-white text-sm flex items-center ${
                      index > 0 ? "mx-8" : ""
                    }`}
                    onClick={() =>
                      router.push("/my/proclaim/" + proclaim.index)
                    }
                  >
                    <Image
                      src="/images/icons/volume-up.svg"
                      alt="Volume Icon"
                      width={20}
                      height={20}
                      className="mr-1"
                    />
                    {proclaim.title}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Project Introduction */}
          <div className="mb-4 mt-4 p-6 rounded-xl border border-purple-600/80">
            <h3 className="text-lg font-semibold mb-2 flex items-center">
              <div className="w-1 h-6 bg-gradient-to-b from-gradient-purple-0% to-gradient-purple-100% mr-2"></div>
              <span className="text-stroke-2">{t("project_intro.title")}</span>
            </h3>
            <p className="text-sl text-gray-300 mb-4">
              {t("project_intro.description")}
            </p>
            <h3 className="text-lg font-semibold mb-2 flex items-center">
              <div className="w-1 h-6 bg-gradient-to-b from-gradient-purple-0% to-gradient-purple-100% mr-2"></div>
              <span className="text-stroke-2">{t("ai_flow.title")}</span>
            </h3>
            <p className="text-sl text-gray-300 mb-4">
              {t("ai_flow.description")}
            </p>
          </div>

          {/* Application Ecosystem */}
          <div className="mt-12">
            <h2 className="text-xl font-semibold mb-8 bg-gradient-to-r from-[#BA5BFF] to-[#714BFF] text-white bg-clip-text flex items-center gap-2">
              <div className="w-1 h-8 bg-gradient-to-b text-white"></div>
              {t("app_ecosystem.title")}
            </h2>

            <div className="space-y-6">
              {(t("app_ecosystem.items") as unknown as any[]).map(
                (card: any, index: number) => (
                  <div
                    key={index}
                    className="rounded-2xl p-8 border border-purple-600/80 relative overflow-hidden shadow-[0_0_15px_rgba(88,75,255,0.38)]"
                  >
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.1),transparent_70%)]"></div>
                    <h3 className="text-2xl font-semibold mb-3 text-center">
                      {card.title}
                    </h3>
                    <div className="h-[1px] w-64 bg-gradient-to-r from-transparent via-[#CBAEE4]/80 to-transparent mx-auto mb-4"></div>
                    <p className="text-[#FFFFFF] text-center text-lg leading-relaxed">
                      {card.description}
                    </p>
                  </div>
                )
              )}
            </div>
          </div>

          {/* Roadmap */}
          <div className="mt-12">
            <h2 className="text-xl font-semibold mb-8 bg-gradient-to-r from-[#BA5BFF] to-[#714BFF] text-white bg-clip-text flex items-center gap-2">
              <div className="w-1 h-8 bg-gradient-to-b text-white"></div>
              {t("roadmap.title")}
            </h2>

            <div className="relative">
              <div className="absolute left-[30px] md:left-[50px] top-4 bottom-4 w-[2px] bg-[#6C49FE]/30"></div>

              <div className="space-y-6 md:space-y-6">
                {/* April 2025 */}
                <div className="relative pl-16 md:pl-20">
                  <div className="absolute left-0 md:left-[20px] top-[22px] w-[60px] h-[60px] flex items-center justify-center">
                    <div className="absolute w-3 h-3 rounded-full bg-[#6C49FE]"></div>
                  </div>
                  <div className="relative w-full md:w-[80%] lg:w-[70%] xl:w-[60%]">
                    <RoadmapItem
                      date={t("roadmap.april_2025.date")}
                      title={t("roadmap.april_2025.title")}
                    />
                  </div>
                </div>

                {/* May 2025 */}
                <div className="relative pl-16 md:pl-20">
                  <div className="absolute left-0 md:left-[20px] top-[22px] w-[60px] h-[60px] flex items-center justify-center">
                    <div className="absolute w-3 h-3 rounded-full bg-[#6C49FE]"></div>
                  </div>
                  <div className="relative w-full md:w-[80%] lg:w-[70%] xl:w-[60%]">
                    <RoadmapItem
                      date={t("roadmap.may_2025.date")}
                      title={t("roadmap.may_2025.title")}
                    />
                  </div>
                </div>

                {/* June 2025 */}
                <div className="relative pl-16 md:pl-20">
                  <div className="absolute left-0 md:left-[20px] top-[22px] w-[60px] h-[60px] flex items-center justify-center">
                    <div className="absolute w-3 h-3 rounded-full bg-[#6C49FE]"></div>
                  </div>
                  <div className="relative w-full md:w-[80%] lg:w-[70%] xl:w-[60%]">
                    <RoadmapItem
                      date={t("roadmap.june_2025.date")}
                      title={t("roadmap.june_2025.title")}
                    />
                  </div>
                </div>

                {/* Q3 2025 */}
                <div className="relative pl-16 md:pl-20">
                  <div className="absolute left-0 md:left-[20px] top-[22px] w-[60px] h-[60px] flex items-center justify-center">
                    <div className="absolute w-3 h-3 rounded-full bg-[#6C49FE]"></div>
                  </div>
                  <div className="relative w-full md:w-[80%] lg:w-[70%] xl:w-[60%]">
                    <RoadmapItem
                      date={t("roadmap.q3_2025.date")}
                      title={t("roadmap.q3_2025.title")}
                    />
                  </div>
                </div>

                {/* Q4 2025 */}
                <div className="relative pl-16 md:pl-20">
                  <div className="absolute left-0 md:left-[20px] top-[22px] w-[60px] h-[60px] flex items-center justify-center">
                    <div className="absolute w-3 h-3 rounded-full bg-[#6C49FE]"></div>
                  </div>
                  <div className="relative w-full md:w-[80%] lg:w-[70%] xl:w-[60%]">
                    <RoadmapItem
                      date={t("roadmap.q4_2025.date")}
                      title={t("roadmap.q4_2025.title")}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Partners */}
          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-8 bg-gradient-to-r from-[#BA5BFF] to-[#714BFF] text-white bg-clip-text flex items-center gap-2">
              <div className="w-1 h-8 bg-gradient-to-b text-white"></div>
              {t("partners")}
            </h2>
            <div className="grid grid-cols-4 gap-4">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                <div
                  key={num}
                  className="h-12 rounded-md flex items-center justify-center"
                >
                  <Image
                    src={`/images/partners/client-${num
                      .toString()
                      .padStart(2, "a")}.png`}
                    alt={`Partner ${num}`}
                    width={120}
                    height={48}
                    className="w-[95%] h-[95%] object-contain hover:scale-110 transition-transform duration-300"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Navigation is now in client layout */}
    </div>
  );
}

export default function UserPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <main>
        <Suspense fallback={<LoadingSpinner />}>
          <UserContent />
        </Suspense>
      </main>
    </div>
  );
}
