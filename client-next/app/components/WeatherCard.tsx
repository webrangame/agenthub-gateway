'use client';

import React from 'react';
import { CloudRain, Sun, Cloud, Wind, CloudSnow, CloudDrizzle, Cloudy, MapPin } from 'lucide-react';

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
        <div className="bg-white border border-[#9DBEF8] rounded-2xl p-4 shadow-sm hover:shadow-md transition-all duration-300 group w-full">
            <div className="flex items-center justify-between gap-4">
                {/* Left: Temp & Icon */}
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-[#EEF5FF] rounded-xl border border-[#9DBEF8]/30 text-[#003580] group-hover:scale-110 transition-transform">
                        <Icon className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="text-3xl font-black text-black tracking-tight leading-none">
                            {temp}
                        </div>
                        <div className="text-[10px] font-bold text-[#003580] uppercase tracking-wide mt-0.5">
                            {condition}
                        </div>
                    </div>
                </div>

                {/* Right: Location & Meta */}
                <div className="text-right">
                    <div className="flex items-center justify-end gap-1 text-[#003580] mb-0.5">
                        <span className="text-sm font-bold truncate max-w-[120px]">{location}</span>
                        <MapPin className="w-3 h-3" />
                    </div>
                    <div className="text-[10px] text-gray-400 font-medium">
                        Live Update
                    </div>
                </div>
            </div>

            {/* Description as a compact footer */}
            {description && (
                <div className="mt-3 pt-3 border-t border-[#EEF5FF]">
                    <p className="text-xs text-[#003580]/80 leading-snug line-clamp-2">
                        {description}
                    </p>
                </div>
            )}
        </div>
    );
};

export default WeatherCard;
