"use client";

 import Image from "next/image";

 const MainHeader = () => {
 return (
 <div className="relative w-full h-[104vh] text-center flex items-center justify-center bg-black">
 <Image
 src="https://placehold.co/1920x1080.png"
 alt="Hero background"
 width={1920}
 height={1080}
 className="absolute inset-0 w-full h-full object-cover opacity-30"
 data-ai-hint="male model"
 priority
 />
 <div className="relative border-4 border-gray-400 p-6 shadow-lg">
 <h1 className="text-[10.4rem] font-serif text-white">Italo Santos</h1>
 </div>
 </div>
 );
 };

 export default MainHeader;