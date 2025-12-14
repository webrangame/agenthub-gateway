'use client';

import React from 'react';
import { CloudRain, Sun, Cloud, Wind, CloudSnow, CloudDrizzle, Cloudy, Activity, MapPin } from 'lucide-react';

interface WeatherCardProps {
    location: string;
    temp: string;
    condition: string;
    description?: string;
}

const WeatherCard: React.FC<WeatherCardProps> = ({ location, temp, condition, description }) => {
    const getIcon = (cond: string) => {
        const lowerCond = cond.toLowerCase();
        if (lowerCond.includes('rain') || lowerCond.includes('rainy')) return CloudRain;
        if (lowerCond.includes('sun') || lowerCond.includes('clear')) return Sun;
        if (lowerCond.includes('snow')) return CloudSnow;
        if (lowerCond.includes('drizzle')) return CloudDrizzle;
        if (lowerCond.includes('wind')) return Wind;
        if (lowerCond.includes('cloud') || lowerCond.includes('overcast')) return Cloudy;
        return Cloud;
    };

    const Icon = getIcon(condition);

    return (
        <div className="group relative bg-white border border-[#9DBEF8] rounded-2xl p-6 transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,53,128,0.1)] hover:border-[#003580]/20 overflow-hidden cursor-default">
            
            {/* Dynamic Background Elements */}
            <div className="absolute -right-20 -top-20 w-64 h-64 bg-linear-to-br from-[#EEF5FF] to-[#9DBEF8]/20 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
            
            <div className="flex justify-between items-start mb-6 relative z-10">
                <div>
                     <div className="flex items-center gap-2 mb-2">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#EEF5FF] border border-[#9DBEF8] text-[10px] font-bold text-[#003580] uppercase tracking-wider shadow-sm">
                            <Activity className="w-3 h-3 text-[#003580]" /> 
                            <span>Live</span>
                        </span>
                        <span className="text-[10px] font-semibold text-gray-500 flex items-center gap-0.5">
                            <MapPin className="w-3 h-3 text-[#003580]" />
                            Station 1
                        </span>
                     </div>
                     <h3 className="text-2xl font-bold text-black tracking-tight group-hover:translate-x-1 transition-transform duration-300">{location}</h3>
                </div>
                
                {/* Icon Container */}
                <div className="relative group/icon">
                    <div className="absolute inset-0 bg-[#9DBEF8] rounded-2xl blur-xl opacity-0 group-hover:opacity-30 transition-opacity duration-300" />
                    <div className="relative p-4 bg-[#EEF5FF] rounded-2xl shadow-sm border border-[#9DBEF8] group-hover:-translate-y-1 group-hover:rotate-3 transition-all duration-300 group-hover:shadow-md">
                        <Icon className="w-8 h-8 text-[#003580]" />
                    </div>
                </div>
            </div>

            <div className="relative z-10">
                <div className="flex items-baseline gap-1 mb-5">
                    <div className="text-6xl font-black text-black tracking-tighter leading-none group-hover:scale-105 transition-transform duration-300 origin-left">
                        {temp}
                    </div>
                    <div className="flex flex-col ml-2">
                        <span className="text-sm font-bold text-[#003580] uppercase tracking-wide">
                            {condition}
                        </span>
                        <span className="text-[10px] text-gray-500 font-semibold">
                            Feels like {temp}
                        </span>
                    </div>
                </div>

                {/* Description Box */}
                {description && (
                    <div className="relative overflow-hidden rounded-xl bg-[#EEF5FF] border border-[#9DBEF8]/50 p-4 transition-colors duration-300 group-hover:border-[#9DBEF8]">
                        <p className="text-sm text-[#003580] leading-relaxed font-medium">
                            {description}
                        </p>
                    </div>
                )}
            </div>
            
        </div>
    );
};

export default WeatherCard;
