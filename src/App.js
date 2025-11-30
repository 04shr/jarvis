import React, { useRef } from "react";
import LeftSidebar from "./components/LeftSidebar";
import MainContent from "./components/MainContent";
import RightSidebar from "./components/RightSidebar";
import "./styles/global.css"; // ensure this exists and includes Tailwind imports

export default function App() {
  const petRef = useRef(null);

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#050710] via-[#07102a] to-[#2b0b3a]">
      <div className="w-full h-screen flex items-stretch">
        {/* LEFT */}
        <div className="w-[260px] border-r border-[#1a2439]">
          <LeftSidebar />
        </div>

        {/* CENTER */}
        <div className="flex-1 flex flex-col items-center justify-start">
          <MainContent petRef={petRef} />
        </div>

        {/* RIGHT */}
        <div className="w-[320px] border-l border-[#1a2439]">
          <RightSidebar petRef={petRef} />
        </div>
      </div>
    </div>
  );
}
