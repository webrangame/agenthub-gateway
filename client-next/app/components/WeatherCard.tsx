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

    // Dynamic gradient based on condition
    const getGradient = (cond: string) => {
        const lowerCond = cond.toLowerCase();
        if (lowerCond.includes('rain')) return 'from-slate-600 to-slate-800';
        if (lowerCond.includes('sun') || lowerCond.includes('clear')) return 'from-orange-400 to-pink-500';
        if (lowerCond.includes('cloud')) return 'from-blue-400 to-blue-600';
        return 'from-cyan-500 to-blue-600'; // Default
    };

    const Icon = getIcon(condition);
    const gradientClass = getGradient(condition);

    return (
        <div className={`bg-gradient-to-br ${gradientClass} rounded-xl p-6 text-white shadow-2xl hover-lift relative overflow-hidden`}>
            {/* Decorative background pattern */}
            <div className="absolute top-0 right-0 opacity-10">
                <Icon className="w-32 h-32 -mt-8 -mr-8" />
            </div>

            {/* Content */}
            <div className="relative z-10">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h3 className="text-2xl font-bold mb-1">{location}</h3>
                        <p className="text-xs text-white/80 font-medium uppercase tracking-wide">Current Conditions</p>
                    </div>
                    <Icon className="w-12 h-12 text-white/90" />
                </div>

                <div className="flex items-baseline gap-3 mb-2">
                    <span className="text-5xl font-black">{temp}</span>
                    <span className="text-lg text-white/90 font-semibold">{condition}</span>
                </div>

                {/* Full description if provided */}
                {description && (
                    <p className="text-sm text-white/90 mt-4 leading-relaxed">
                        {description}
                    </p>
                )}
            </div>
        </div>
    );
};

export default WeatherCard;




