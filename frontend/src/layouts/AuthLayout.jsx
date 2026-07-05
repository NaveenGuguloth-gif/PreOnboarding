import { Outlet } from "react-router-dom";

const AUTH_VIDEO_URL =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260424_064411_9e9d7f84-9277-41f4-ab10-59172d89e6be.mp4";

const AUTH_POSTER_URL =
  "https://images.unsplash.com/photo-1557683316-973673baf926?w=1600&q=60";

const TATA_MOTORS_LOGO_URL =
  "https://upload.wikimedia.org/wikipedia/commons/f/f1/Tata_Motors_Logo.svg";

export default function AuthLayout() {
  return (
    <div className="min-h-screen w-full bg-[#ededed] p-3 font-[Inter] sm:p-4">
      <div className="relative min-h-[calc(100vh-24px)] w-full overflow-hidden rounded-2xl bg-[#d9d9d9] sm:min-h-[calc(100vh-32px)] sm:rounded-3xl">
        <video
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
          src={AUTH_VIDEO_URL}
          poster={AUTH_POSTER_URL}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          disableRemotePlayback
          webkit-playsinline="true"
          x5-playsinline="true"
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-white/20" />
        <div className="absolute inset-0 bg-gradient-to-b from-white/30 via-white/10 to-black/15" />

        <main className="relative z-20 flex min-h-[calc(100vh-24px)] items-center justify-center px-4 py-10 sm:min-h-[calc(100vh-32px)] sm:px-6 lg:px-10">
          <div className="w-full max-w-[460px]">
            <div className="mb-6 flex flex-col items-center text-center">
              <div className="flex min-h-16 w-full max-w-[300px] items-center justify-center rounded-2xl bg-white/95 px-6 py-4 shadow-xl shadow-black/15 backdrop-blur">
                <img
                  src={TATA_MOTORS_LOGO_URL}
                  alt="Tata Motors"
                  className="h-auto w-full"
                />
              </div>
              <p className="mt-1 rounded-full bg-white/75 px-4 py-1.5 text-sm font-semibold text-neutral-700 shadow-sm backdrop-blur">
                Pre-Onboarding Portal
              </p>
            </div>

            <div className="rounded-2xl border border-white/80 bg-white/90 p-6 text-neutral-950 shadow-2xl shadow-black/20 backdrop-blur-xl sm:p-8">
              <Outlet />
            </div>

            <p className="mt-4 rounded-full bg-white/75 px-4 py-2 text-center text-xs font-medium text-neutral-700 shadow-sm backdrop-blur">
              Demo credentials: any email with password, choose Employee or HR
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
