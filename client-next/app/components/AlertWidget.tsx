'use client';

import React from 'react';
import { AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { motion, Variants } from 'framer-motion';
import { cn } from '../utils/cn';

interface AlertWidgetProps {
    message: string;
    level: 'warning' | 'danger' | 'info';
}

const AlertWidget: React.FC<AlertWidgetProps> = ({ message, level }) => {
    const config = {
        warning: {
            icon: AlertTriangle,
            badgeText: "WARNING",
            stripColorHex: "#FFAB00", 
            iconColor: "text-[#FFAB00]",
            badgeBg: "bg-[#FFF4E5]",
            badgeTextCol: "text-[#B76E00]"
        },
        danger: {
            icon: AlertCircle,
            badgeText: "ALERT",
            stripColorHex: "#FF3B30",
            iconColor: "text-[#FF3B30]",
            badgeBg: "bg-[#FFEBEE]",
            badgeTextCol: "text-[#C62828]"
        },
        info: {
            icon: Info,
            badgeText: "INFO",
            stripColorHex: "#003580",
            iconColor: "text-[#003580]",
            badgeBg: "bg-[#003580]",
            badgeTextCol: "text-white"
        },
    };

    const style = config[level] || config.info;
    const Icon = style.icon;
    const shouldPulse = level === 'danger' || level === 'warning';

    // Define variants for parent-controlled animations
    const cardVariants: Variants = {
        hover: {
            y: -2,
            transition: { duration: 0.2 }
        }
    };

    const iconVariants: Variants = {
        hover: {
            rotate: [0, -15, 15, -15, 15, 0],
            transition: { duration: 0.6, ease: "easeInOut" }
        }
    };

    return (
        <motion.div 
            className="relative w-full rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden mb-2 group border-2"
            variants={cardVariants}
            whileHover="hover"
            initial={{ 
                backgroundColor: style.stripColorHex + "30",
                borderColor: style.stripColorHex 
            }}
            animate={{ 
                backgroundColor: "#ffffff",
                borderColor: shouldPulse 
                    ? [style.stripColorHex, style.stripColorHex + "40", style.stripColorHex] 
                    : style.stripColorHex 
            }}
            transition={{ 
                backgroundColor: { duration: 0.8, ease: "easeOut" },
                borderColor: shouldPulse 
                    ? { duration: 2, repeat: Infinity, ease: "easeInOut" }
                    : { duration: 0.3 }
            }}
        >
            <div className="flex flex-row items-start p-3 pl-4 gap-2">
                {/* Icon Circle - Shakes on card hover via variants */}
                <motion.div 
                    className="shrink-0 pt-0.5"
                    variants={iconVariants}
                >
                    <div className="w-6 h-6 rounded-full bg-gray-50 flex items-center justify-center shadow-sm ring-1 ring-inset ring-black/5">
                        <Icon className={cn("w-3.5 h-3.5", style.iconColor)} />
                    </div>
                </motion.div>

                {/* Content */}
                <div className="flex flex-col items-start gap-0.5 min-w-0">
                    {/* Badge */}
                    <span className={cn(
                        "text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider leading-none",
                        style.badgeBg,
                        style.badgeTextCol
                    )}>
                        {style.badgeText}
                    </span>

                    {/* Message */}
                    <p className="text-xs font-semibold text-black leading-normal mt-0.5">
                        {message}
                    </p>
                </div>
            </div>
        </motion.div>
    );
};

export default AlertWidget;


