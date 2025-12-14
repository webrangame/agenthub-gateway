'use client';

import React from 'react';
import { motion } from 'framer-motion';
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
        <motion.div 
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            whileHover={{ y: -2, scale: 1.005, transition: { duration: 0.2 } }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="bg-white border border-[#9DBEF8] rounded-2xl p-4 shadow-sm hover:shadow-lg hover:shadow-[#003580]/5 transition-shadow duration-300 w-full cursor-default"
        >
            <div className="flex items-center justify-between gap-4">
                {/* Left: Temp & Icon */}
                <div className="flex items-center gap-3">
                    <motion.div 
                        whileHover={{ rotate: [0, -10, 10, 0], scale: 1.1 }}
                        transition={{ duration: 0.5, ease: "easeInOut" }}
                        className="p-2.5 bg-[#EEF5FF] rounded-xl border border-[#9DBEF8]/30 text-[#003580]"
                    >
                        <Icon className="w-6 h-6" />
                    </motion.div>
                    <div>
                        <motion.div 
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 }}
                            className="text-3xl font-black text-black tracking-tight leading-none"
                        >
                            {temp}
                        </motion.div>
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="text-[10px] font-bold text-[#003580] uppercase tracking-wide mt-0.5"
                        >
                            {condition}
                        </motion.div>
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
                <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    transition={{ delay: 0.3, duration: 0.4 }}
                    className="mt-3 pt-3 border-t border-[#EEF5FF] overflow-hidden"
                >
                    <p className="text-xs text-[#003580]/80 leading-snug line-clamp-2">
                        {description}
                    </p>
                </motion.div>
            )}
        </motion.div>
    );
};

export default WeatherCard;
