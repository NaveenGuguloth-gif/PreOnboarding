import LoopingVideoBackground from "../components/common/LoopingVideoBackground";

const HERO_VIDEO_URL =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260328_083109_283f3553-e28f-428b-a723-d639c617eb2b.mp4";

const menuItems = [
  { label: "Home", active: true },
  { label: "Studio" },
  { label: "About" },
  { label: "Journal" },
  { label: "Reach Us" },
];

export default function CinematicHero() {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-background font-body text-[#000000]">
      <LoopingVideoBackground
        src={HERO_VIDEO_URL}
        className="inset-x-0 bottom-0"
        videoClassName="inset-0"
        style={{ inset: "auto 0 0 0", top: "300px" }}
      />

      <nav className="relative z-10 px-8 py-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="font-display text-3xl tracking-tight text-[#000000]">
            Aethera<sup className="align-super text-sm">®</sup>
          </div>
          <div className="hidden items-center gap-8 md:flex">
            {menuItems.map((item) => (
              <a
                key={item.label}
                href="#"
                className={`text-sm transition-colors hover:text-[#000000] ${
                  item.active ? "text-[#000000]" : "text-[#6F6F6F]"
                }`}
              >
                {item.label}
              </a>
            ))}
          </div>
          <button className="rounded-full bg-[#000000] px-6 py-2.5 text-sm text-[#FFFFFF] transition-transform hover:scale-[1.03]">
            Begin Journey
          </button>
        </div>
      </nav>

      <main className="relative z-10 flex flex-col items-center justify-center px-6 pb-40 text-center" style={{ paddingTop: "calc(8rem - 75px)" }}>
        <h1
          className="font-display max-w-7xl animate-fade-rise text-5xl font-normal text-[#000000] sm:text-7xl md:text-8xl"
          style={{ lineHeight: 0.95, letterSpacing: "-2.46px" }}
        >
          Beyond{" "}
          <em className="font-normal italic text-[#6F6F6F]">silence,</em>{" "}
          we build{" "}
          <em className="font-normal italic text-[#6F6F6F]">the eternal.</em>
        </h1>

        <p className="mt-8 max-w-2xl animate-fade-rise-delay text-base leading-relaxed text-[#6F6F6F] sm:text-lg">
          Building platforms for brilliant minds, fearless makers, and thoughtful souls. Through the noise, we craft
          digital havens for deep work and pure flows.
        </p>

        <button className="mt-12 animate-fade-rise-delay-2 rounded-full bg-[#000000] px-14 py-5 text-base text-[#FFFFFF] transition-transform hover:scale-[1.03]">
          Begin Journey
        </button>
      </main>
    </div>
  );
}
