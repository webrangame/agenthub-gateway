'use client';

import React from 'react';
import { AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { cn } from '../utils/cn';

interface AlertWidgetProps {
    message: string;
    level: 'warning' | 'danger' | 'info';
}

const AlertWidget: React.FC<AlertWidgetProps> = ({ message, level }) => {
    const styles = {
        warning: {
            gradient: "gradient-alert-warning",
            textColor: "text-amber-900",
            icon: AlertTriangle,
            iconColor: "text-amber-900",
            badgeText: "Warning"
        },
        danger: {
            gradient: "gradient-alert-danger",
            textColor: "text-red-900",
            icon: AlertCircle,
            iconColor: "text-red-900",
            badgeText: "Alert"
        },
        info: {
            gradient: "gradient-wisdom",
            textColor: "text-blue-900",
            icon: Info,
            iconColor: "text-blue-900",
            badgeText: "Info"
        },
    };

    const currentStyle = styles[level] || styles.info;
    const Icon = currentStyle.icon;

    return (
        <div className={`${currentStyle.gradient} rounded-xl p-5 shadow-lg hover-lift relative overflow-hidden`}>
            {/* Decorative background icon */}
            <div className="absolute top-0 right-0 opacity-10">
                <Icon className="w-24 h-24 -mt-4 -mr-4" />
            </div>

            {/* Content */}
            <div className="relative z-10 flex items-start gap-4">
                <div className="flex-shrink-0">
                    <Icon className={cn("w-7 h-7 animate-pulse", currentStyle.iconColor)} />
                </div>
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="bg-white/30 text-white text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
                            {currentStyle.badgeText}
                        </span>
                    </div>
                    {/* Full message - NO TRUNCATION */}
                    <p className={cn("text-sm font-semibold leading-relaxed whitespace-pre-wrap", currentStyle.textColor)}>
                        {message}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AlertWidget;




