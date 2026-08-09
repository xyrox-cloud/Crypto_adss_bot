import React from 'react';
import { useNavigate } from 'react-router-dom';

const About = () => {
  const navigate = useNavigate();
  return (
    <div className="pb-24">
      {/* HEADER / BANNER */}
      <div className="bg-secondary px-6 py-6 rounded-none text-black relative mb-6">
        <button onClick={() => navigate('/menu')} className="text-black/70 hover:text-black font-bold text-sm mb-4">← Back</button>
        <h1 className="text-3xl font-extrabold uppercase leading-none">AdShare</h1>
        <p className="text-black/70 font-mono text-sm mt-1">Version 1.0.0</p>
        <p className="mt-4 font-bold">"Watch ads, earn real USDT on Telegram"</p>
      </div>

      <div className="px-4">
        <h3 className="text-secondary font-bold uppercase mb-3 text-sm pl-2">How it stays free</h3>
        <div className="bg-cardbg border border-cardborder p-5 rounded-3xl">
          <p className="text-white/80 leading-relaxed text-sm mb-6">
            AdShare uses a fair <strong className="text-white">60/40 revenue split model</strong>. When you watch an ad, the advertiser pays us. We give 60% of that revenue directly back to you in USDT, and we keep 40% to maintain servers, pay transaction fees, and keep the app running smoothly without any hidden costs.
          </p>
          
          <div className="flex flex-wrap items-center justify-center gap-2 text-secondary text-sm font-bold">
            <button onClick={() => navigate('/ad-policy')} className="hover:underline">Ad policy</button>
            <span>·</span>
            <button onClick={() => navigate('/terms')} className="hover:underline">Terms</button>
            <span>·</span>
            <button onClick={() => navigate('/privacy')} className="hover:underline">Privacy</button>
            <span>·</span>
            <button onClick={() => navigate('/support')} className="hover:underline">Support</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;
