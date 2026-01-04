'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Link as LinkIcon, ExternalLink, ChevronLeft, ChevronRight, Play, Image as ImageIcon, CloudRain } from 'lucide-react';
import { cn } from '../utils/cn';
import WeatherWidget from './WeatherWidget';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';

interface LinkItem {
    label: string;
    url: string;
}

interface ContentSection {
    title?: string;
    description?: string;
    media?: {
        type: 'image' | 'video';
        url: string;
    };
}

interface TemplateTwoProps {
    // New format: multiple sections
    sections?: ContentSection[];
    
    // Legacy format: single title/description (backward compatible)
    title?: string;
    subtitle?: string;
    description?: string;
    descriptionMedia?: {
        type: 'image' | 'video';
        url: string;
    };
    
    // Sidebar widgets
    images?: string[];
    videos?: string[];
    links?: LinkItem[];
    weatherLocation?: string;
    weatherData?: {
        temp: string;
        condition: string;
        description?: string;
    };
    mapLocation?: {
        lat: number;
        lng: number;
        label: string;
    };
    className?: string;
}

const TemplateTwo: React.FC<TemplateTwoProps> = ({
    sections,
    title,
    subtitle,
    description,
    descriptionMedia,
    images = [],
    videos = [],
    links = [],
    weatherLocation,
    weatherData,
    mapLocation,
    className
}) => {
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    
    // Backward compatibility: Convert legacy props to sections format
    const contentSections: ContentSection[] = sections || (
        (title || description || descriptionMedia) 
            ? [{
                title: title || subtitle,
                description: description,
                media: descriptionMedia
            }]
            : []
    );

    const nextImage = () => {
        if (images.length > 0) {
            setCurrentImageIndex((prev) => (prev + 1) % images.length);
        }
    };

    const prevImage = () => {
        if (images.length > 0) {
            setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
        }
    };

    return (
        <div className={cn("bg-white border border-[#9DBEF8] rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300", className)}>
            <div className="flex flex-col lg:flex-row">
                {/* LEFT SIDE - 75% */}
                <div className="lg:w-3/4 border-b lg:border-b-0 lg:border-r border-[#EEF5FF]">
                    {/* Multiple Content Sections */}
                    {contentSections.map((section, index) => (
                        <div 
                            key={index}
                            className={`p-5 ${index < contentSections.length - 1 ? 'border-b border-[#EEF5FF]' : ''}`}
                        >
                            {/* Section Title */}
                            {section.title && (
                                <h2 className="text-xl font-black text-[#003580] leading-tight mb-3">
                                    {section.title}
                                </h2>
                            )}

                            {/* Content wrapper with media and description */}
                            <div className="overflow-hidden">
                                {/* Section Media (Image or Video) - Float Left */}
                                {section.media && (
                                    <div className="float-left mr-4 mb-3 w-48">
                                        {section.media.type === 'image' ? (
                                            <div className="relative rounded-lg overflow-hidden border border-[#9DBEF8]/30 bg-[#EEF5FF] shadow-sm max-h-40">
                                                <img
                                                    src={section.media.url}
                                                    alt={section.title || "Section media"}
                                                    className="w-full h-full object-cover max-h-40"
                                                />
                                            </div>
                                        ) : (
                                            <div className="relative rounded-lg overflow-hidden border border-[#9DBEF8]/30 bg-black shadow-sm h-32">
                                                <iframe
                                                    src={section.media.url}
                                                    className="w-full h-full"
                                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                    allowFullScreen
                                                    title={section.title || "Section video"}
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Section Description - Wraps around media */}
                                {section.description && (
                                    <div className="prose prose-sm max-w-none text-[#003580]/80">
                                        <ReactMarkdown
                                            remarkPlugins={[remarkGfm, remarkBreaks]}
                                            components={{
                                                p: ({ node, ...props }) => (
                                                    <p className="mb-2 last:mb-0 leading-relaxed text-justify" {...props} />
                                                ),
                                                strong: ({ node, ...props }) => (
                                                    <strong className="font-bold text-[#003580]" {...props} />
                                                ),
                                                ul: ({ node, ...props }) => (
                                                    <ul className="list-disc ml-5 mb-2 space-y-1" {...props} />
                                                ),
                                                ol: ({ node, ...props }) => (
                                                    <ol className="list-decimal ml-5 mb-2 space-y-1" {...props} />
                                                ),
                                                li: ({ node, ...props }) => (
                                                    <li className="leading-relaxed" {...props} />
                                                ),
                                                a: ({ node, ...props }) => (
                                                    <a className="underline hover:text-blue-600" target="_blank" rel="noopener noreferrer" {...props} />
                                                ),
                                                hr: () => (
                                                    <hr className="my-4 border-[#9DBEF8]/40" />
                                                ),
                                                h1: ({ node, ...props }) => (
                                                    <h1 className="text-lg font-black text-[#003580] mt-4 mb-2" {...props} />
                                                ),
                                                h2: ({ node, ...props }) => (
                                                    <h2 className="text-base font-extrabold text-[#003580] mt-4 mb-2" {...props} />
                                                ),
                                                h3: ({ node, ...props }) => (
                                                    <h3 className="text-sm font-bold text-[#003580] mt-3 mb-1.5" {...props} />
                                                ),
                                                code: ({ node, ...props }) => (
                                                    <code className="px-1 py-0.5 rounded bg-[#EEF5FF] border border-[#9DBEF8]/30 text-[11px]" {...props} />
                                                ),
                                                pre: ({ node, ...props }) => (
                                                    <pre className="p-3 rounded bg-[#EEF5FF] border border-[#9DBEF8]/30 overflow-x-auto text-[11px]" {...props} />
                                                ),
                                            }}
                                        >
                                            {section.description}
                                        </ReactMarkdown>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* RIGHT SIDE - 25% */}
                <div className="lg:w-1/4 p-4 space-y-4 bg-[#EEF5FF]/30">
                    {/* Images Gallery */}
                    {images.length > 0 && (
                        <div className="space-y-2">
                            <div className="flex items-center gap-1.5 text-[#003580] mb-2">
                                <ImageIcon className="w-3.5 h-3.5" />
                                <h3 className="text-[10px] font-bold uppercase tracking-wider">Gallery</h3>
                            </div>
                            <div className="relative rounded-lg overflow-hidden bg-[#EEF5FF] border border-[#9DBEF8]/30 group">
                                <div className="aspect-square relative">
                                    <motion.img
                                        key={currentImageIndex}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ duration: 0.3 }}
                                        src={images[currentImageIndex]}
                                        alt={`Image ${currentImageIndex + 1}`}
                                        className="w-full h-full object-cover"
                                    />
                                    
                                    {images.length > 1 && (
                                        <>
                                            <button 
                                                onClick={prevImage}
                                                className="absolute left-1 top-1/2 -translate-y-1/2 p-1 bg-black/30 hover:bg-black/50 text-white rounded-full backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100"
                                            >
                                                <ChevronLeft className="w-3 h-3" />
                                            </button>
                                            <button 
                                                onClick={nextImage}
                                                className="absolute right-1 top-1/2 -translate-y-1/2 p-1 bg-black/30 hover:bg-black/50 text-white rounded-full backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100"
                                            >
                                                <ChevronRight className="w-3 h-3" />
                                            </button>
                                            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 px-2 py-1 bg-black/30 backdrop-blur-sm rounded-full">
                                                {images.map((_, idx) => (
                                                    <div 
                                                        key={idx}
                                                        className={`w-1 h-1 rounded-full transition-colors ${idx === currentImageIndex ? 'bg-white' : 'bg-white/40'}`}
                                                    />
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Videos */}
                    {videos.length > 0 && (
                        <div className="space-y-2">
                            <div className="flex items-center gap-1.5 text-[#003580] mb-2">
                                <Play className="w-3.5 h-3.5" />
                                <h3 className="text-[10px] font-bold uppercase tracking-wider">Videos</h3>
                            </div>
                            {videos.map((video, idx) => (
                                <div key={idx} className="relative rounded-lg overflow-hidden border border-[#9DBEF8]/30 bg-black aspect-video">
                                    <iframe
                                        src={video}
                                        className="w-full h-full"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                        title={`Video ${idx + 1}`}
                                    />
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Weather Section */}
                    {weatherLocation && (
                        <div className="space-y-2">
                            <div className="flex items-center gap-1.5 text-[#003580] mb-2">
                                <CloudRain className="w-3.5 h-3.5" />
                                <h3 className="text-[10px] font-bold uppercase tracking-wider">Weather</h3>
                            </div>
                            <WeatherWidget 
                                location={weatherLocation}
                                temp={weatherData?.temp || "--°C"}
                                condition={weatherData?.condition || "Loading..."} 
                                description={weatherData?.description || "Weather data would appear here."}
                            />
                        </div>
                    )}

                    {/* Map Location Section */}
                    {mapLocation && (
                        <div className="space-y-2">
                            <div className="flex items-center gap-1.5 text-[#003580] mb-2">
                                <MapPin className="w-3.5 h-3.5" />
                                <h3 className="text-[10px] font-bold uppercase tracking-wider">Location</h3>
                            </div>
                            <div className="bg-white rounded-lg p-2 border border-[#9DBEF8]/50">
                                <p className="text-[9px] font-semibold text-[#003580] mb-1">{mapLocation.label}</p>
                                <div className="aspect-square w-full bg-slate-200 rounded-md overflow-hidden relative">
                                    <iframe
                                        width="100%"
                                        height="100%"
                                        frameBorder="0"
                                        scrolling="no"
                                        marginHeight={0}
                                        marginWidth={0}
                                        src={`https://www.openstreetmap.org/export/embed.html?bbox=${mapLocation.lng - 0.05},${mapLocation.lat - 0.05},${mapLocation.lng + 0.05},${mapLocation.lat + 0.05}&layer=mapnik&marker=${mapLocation.lat},${mapLocation.lng}`}
                                        className="w-full h-full opacity-80 hover:opacity-100 transition-opacity"
                                        title="Location Map"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Links Section */}
                    {links.length > 0 && (
                        <div className="space-y-2">
                            <div className="flex items-center gap-1.5 text-[#003580] mb-2">
                                <LinkIcon className="w-3.5 h-3.5" />
                                <h3 className="text-[10px] font-bold uppercase tracking-wider">Links</h3>
                            </div>
                            <div className="space-y-1.5">
                                {links.map((link, idx) => (
                                    <a
                                        key={idx}
                                        href={link.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-between gap-2 px-2 py-1.5 bg-white border border-[#9DBEF8] rounded-md text-[10px] text-[#003580] hover:bg-[#EEF5FF] hover:border-[#003580]/30 transition-all group"
                                    >
                                        <span className="font-medium truncate">{link.label}</span>
                                        <ExternalLink className="w-3 h-3 shrink-0 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform" />
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TemplateTwo;

