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
            badgeText: "Warning",
            accentColor: "text-amber-600",
            borderColor: "border-amber-200",
            bgColor: "bg-amber-50"
        },
        danger: {
            icon: AlertCircle,
            badgeText: "Alert",
            accentColor: "text-red-600",
            borderColor: "border-red-200",
            bgColor: "bg-red-50"
        },
        info: {
            icon: Info,
            badgeText: "Info",
            accentColor: "text-[#003580]",
            borderColor: "border-[#9DBEF8]",
            bgColor: "bg-[#EEF5FF]"
        },
    };

    // To strictly follow the "blue variant" request while keeping semantic meaning,
    // we will use the blue theme as the base structure but use semantic accents.
    // However, for a "super professional" look, we can mute the semantic colors 
    // or use them as subtle indicators alongside the primary blue branding.
    
    // Let's use the blue theme for the card body, but accent the icon and badge.
    
    const style = config[level] || config.info;
    const Icon = style.icon;

    return (
        <div className="bg-[#EEF5FF] border border-[#9DBEF8] rounded-xl p-5 shadow-sm hover:shadow-md hover:shadow-[#003580]/5 transition-all duration-300 hover:-translate-y-0.5 relative overflow-hidden group">
             {/* Left accent bar */}
            <div className={cn("absolute left-0 top-0 bottom-0 w-1.5", 
                level === 'danger' ? 'bg-red-500' : 
                level === 'warning' ? 'bg-amber-500' : 'bg-[#003580]'
            )} />

            <div className="flex items-start gap-4 pl-2">
                <div className={cn("p-2 rounded-full bg-white border border-[#9DBEF8]/50 shadow-sm shrink-0", 
                     level === 'danger' ? 'text-red-600' : 
                     level === 'warning' ? 'text-amber-600' : 'text-[#003580]'
                )}>
                    <Icon className="w-5 h-5" />
                </div>
                
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                        <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide border",
                            level === 'danger' ? 'bg-red-100 text-red-700 border-red-200' : 
                            level === 'warning' ? 'bg-amber-100 text-amber-700 border-amber-200' : 
                            'bg-[#003580] text-white border-[#003580]'
                        )}>
                            {style.badgeText}
                        </span>
                    </div>
                    
                    <p className="text-sm font-semibold text-[#003580] leading-relaxed whitespace-pre-wrap">
                        {message}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AlertWidget;
