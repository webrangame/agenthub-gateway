'use client';

import React from 'react';
import { AlertCircle, AlertTriangle, Info } from 'lucide-react';
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
            // Amber/Orange theme
            stripColor: "bg-[#FFAB00]", 
            iconColor: "text-[#FFAB00]",
            badgeBg: "bg-[#FFF4E5]",
            badgeTextCol: "text-[#B76E00]"
        },
        danger: {
            icon: AlertCircle,
            badgeText: "ALERT",
            // Red theme
            stripColor: "bg-[#FF3B30]",
            iconColor: "text-[#FF3B30]",
            badgeBg: "bg-[#FFEBEE]",
            badgeTextCol: "text-[#C62828]"
        },
        info: {
            icon: Info,
            badgeText: "INFO",
            // Blue theme
            stripColor: "bg-[#003580]",
            iconColor: "text-[#003580]",
            badgeBg: "bg-[#003580]",
            badgeTextCol: "text-white"
        },
    };

    const style = config[level] || config.info;
    const Icon = style.icon;

    return (
        <div className="relative w-full rounded-xl bg-white shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 overflow-hidden mb-3">
            {/* Left Accent Strip */}
            <div className={cn("absolute left-0 top-0 bottom-0 w-1.5", style.stripColor)} />

            <div className="flex flex-row items-start p-4 pl-6 gap-3">
                {/* Icon Circle */}
                <div className="shrink-0">
                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm">
                        <Icon className={cn("w-5 h-5", style.iconColor)} />
                    </div>
                </div>

                {/* Content */}
                <div className="flex flex-col items-start gap-1">
                    {/* Badge */}
                    <span className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider",
                        style.badgeBg,
                        style.badgeTextCol
                    )}>
                        {style.badgeText}
                    </span>

                    {/* Message */}
                    <p className="text-sm font-semibold text-[#003580] leading-snug mt-1">
                        {message}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AlertWidget;
