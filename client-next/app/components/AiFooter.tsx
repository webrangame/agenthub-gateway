import React from 'react';

const AiFooter: React.FC = () => {
    return (
        <div className="w-full bg-white border-t border-gray-200 py-3 px-6 flex flex-col md:flex-row items-center justify-between gap-2 text-[10px] text-gray-500 z-50">
            <div className="flex-1 text-center md:text-left">
                © 2025 NiyoGen PTE LTD. All rights reserved.
            </div>
            <div className="flex items-center gap-4 whitespace-nowrap">
                <a href="https://market.niyogen.com/terms" target="_blank" rel="noopener noreferrer" className="hover:text-[#003580] hover:underline transition-colors">Terms & Conditions</a>
                <span className="text-gray-300">|</span>
                <a href="https://market.niyogen.com/privacy" target="_blank" rel="noopener noreferrer" className="hover:text-[#003580] hover:underline transition-colors">Privacy Policy</a>
            </div>
        </div>
    );
};

export default AiFooter;
