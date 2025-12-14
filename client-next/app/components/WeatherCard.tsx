'use client';

import React from 'react';
import { CloudRain, Sun, Cloud, Wind, CloudSnow, CloudDrizzle, Cloudy } from 'lucide-react';

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
        <div className="bg-[#EEF5FF] border border-[#9DBEF8] rounded-xl p-6 text-[#003580] shadow-sm hover:shadow-md hover:shadow-[#003580]/5 transition-all duration-300 hover:scale-[1.01] relative overflow-hidden group">
            {/* Decorative background circle */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#9DBEF8]/20 rounded-full blur-3xl group-hover:bg-[#9DBEF8]/30 transition-colors"></div>

            <div className="relative z-10">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h3 className="text-2xl font-bold mb-1 tracking-tight">{location}</h3>
                        <p className="text-xs text-[#003580]/70 font-semibold uppercase tracking-wide">Current Conditions</p>
                    </div>
                    <div className="p-3 bg-white rounded-full shadow-sm border border-[#9DBEF8]/30">
                        <Icon className="w-8 h-8 text-[#003580]" />
                    </div>
                </div>

                <div className="flex items-baseline gap-3 mb-3">
                    <span className="text-5xl font-black tracking-tighter">{temp}</span>
                    <span className="text-lg text-[#003580]/80 font-medium">{condition}</span>
                </div>

                {description && (
                    <div className="mt-4 pt-4 border-t border-[#9DBEF8]/30">
                        <p className="text-sm text-[#003580]/80 leading-relaxed font-medium">
                            {description}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default WeatherCard;
