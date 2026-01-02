'use client';

import React from 'react';
import { CloudRain, Sun, Cloud, Wind, CloudSnow, CloudDrizzle, Cloudy } from 'lucide-react';

interface WeatherWidgetProps {
    location: string;
    temp: string;
    condition: string;
    description?: string;
}

const WeatherWidget: React.FC<WeatherWidgetProps> = ({ location, temp, condition, description }) => {
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
        <div className="bg-[#EEF5FF] border border-[#9DBEF8] rounded-xl p-2.5 text-[#003580] relative overflow-hidden">
            {/* Decorative background circle */}
            <div className="absolute -top-8 -right-8 w-24 h-24 bg-[#9DBEF8]/20 rounded-full blur-2xl"></div>

            <div className="relative z-10 text-center space-y-1.5">
                {/* Location */}
                <h3 className="text-base font-black tracking-tight leading-tight">
                    {location}
                </h3>

                {/* Current Conditions Label */}
                <p className="text-[9px] text-[#003580]/70 font-bold uppercase tracking-widest">
                    Current Conditions
                </p>

                {/* Weather Icon */}
                <div className="flex justify-center py-1">
                    <div className="p-1.5 bg-white/60 rounded-full">
                        <Icon className="w-5 h-5 text-[#003580]" />
                    </div>
                </div>

                {/* Temperature */}
                <div className="flex items-baseline justify-center gap-1">
                    <span className="text-3xl font-black tracking-tighter">{temp}</span>
                </div>

                {/* Condition */}
                <p className="text-xs font-bold text-[#003580]/80">
                    {condition}
                </p>

                {/* Description */}
                {description && (
                    <div className="pt-1.5 border-t border-[#9DBEF8]/40">
                        <p className="text-[10px] text-[#003580]/70 leading-snug">
                            {description}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default WeatherWidget;

