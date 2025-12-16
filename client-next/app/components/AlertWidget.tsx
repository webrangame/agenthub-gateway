'use client';

import React from 'react';
import { AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { motion, Variants } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
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
                    <div className="text-xs font-medium text-gray-800 leading-normal mt-1 w-full max-h-80 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-200">
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm, remarkBreaks]}
                            components={{
                                p: ({ node, ...props }) => <p className="mb-1 last:mb-0" {...props} />,
                                strong: ({ node, ...props }) => <strong className="font-bold text-gray-900" {...props} />,
                                ul: ({ node, ...props }) => <ul className="list-disc ml-4 my-1" {...props} />,
                                ol: ({ node, ...props }) => <ol className="list-decimal ml-4 my-1" {...props} />,
                                li: ({ node, ...props }) => <li className="mb-0.5" {...props} />,
                                a: ({ node, ...props }) => <a className="underline hover:text-blue-600 font-medium" target="_blank" rel="noopener noreferrer" {...props} />,
                                blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-gray-300 pl-3 italic my-1 text-gray-600" {...props} />,
                                // Table Support
                                table: ({ node, ...props }) => (
                                    <div className="overflow-x-auto my-2 border rounded-md border-gray-200 bg-white">
                                        <table className="w-full text-left border-collapse text-[10px]" {...props} />
                                    </div>
                                ),
                                thead: ({ node, ...props }) => <thead className="bg-gray-50 border-b border-gray-200" {...props} />,
                                tbody: ({ node, ...props }) => <tbody className="divide-y divide-gray-100" {...props} />,
                                tr: ({ node, ...props }) => <tr className="hover:bg-gray-50/50" {...props} />,
                                th: ({ node, ...props }) => <th className="px-2 py-1.5 font-semibold text-gray-600 whitespace-nowrap" {...props} />,
                                td: ({ node, ...props }) => <td className="px-2 py-1.5 align-top text-gray-700" {...props} />,
                                code: ({ node, ...props }) => {
                                    const { className, children, ...rest } = props as any;
                                    const match = /language-(\w+)/.exec(className || '');
                                    const isInline = !match && !String(children).includes('\n');
                                    return isInline ? (
                                        <code className="bg-gray-100 px-1 py-0.5 rounded font-mono text-[9px] text-[#d63384] border border-gray-200" {...rest}>
                                            {children}
                                        </code>
                                    ) : (
                                        <div className="bg-[#1e1e1e] p-2 rounded-md my-2 overflow-x-auto shadow-inner">
                                            <code className={`font-mono text-[9px] text-blue-100 ${className || ''}`} {...rest}>
                                                {children}
                                            </code>
                                        </div>
                                    );
                                }
                            }}
                        >
                            {message}
                        </ReactMarkdown>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default AlertWidget;
