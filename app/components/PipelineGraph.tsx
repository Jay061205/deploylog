'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Loader2, Circle, Play } from 'lucide-react';

export interface PipelineStage {
    name: string;
    status: 'pending' | 'running' | 'success' | 'failed' | 'skipped';
    duration?: string;
}

interface PipelineGraphProps {
    stages: PipelineStage[];
    onStageClick?: (stageName: string) => void;
}

const statusColors = {
    pending: 'border-slate-300 text-slate-300 bg-white', // Hollow grey
    running: 'border-blue-500 text-blue-500 bg-white ring-4 ring-blue-50', // Blue ring
    success: 'border-green-500 bg-green-500 text-white', // Solid Green
    failed: 'border-red-500 bg-red-500 text-white', // Solid Red
    skipped: 'border-slate-200 text-slate-200 bg-slate-50', // Ghostly
};

export function PipelineGraph({ stages, onStageClick }: PipelineGraphProps) {
    return (
        <div className="w-full py-12 px-4 flex justify-center">
            <div className="flex items-center">
                <AnimatePresence>
                    {stages.map((stage, index) => {
                        const isLast = index === stages.length - 1;
                        const isActive = stage.status === 'running';
                        const isSuccess = stage.status === 'success';
                        const isFailed = stage.status === 'failed';
                        const isPending = stage.status === 'pending';

                        // Icon Selection
                        let Icon = Circle;
                        if (isActive) Icon = Loader2;
                        if (isSuccess) Icon = Check;
                        if (isFailed) Icon = X;
                        if (stage.name === 'Start') Icon = Play;

                        return (
                            <React.Fragment key={stage.name}>
                                {/* Stage Node */}
                                <div className="relative group">
                                    <motion.button
                                        initial={{ scale: 0.5, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        transition={{ delay: index * 0.1, type: "spring", stiffness: 300, damping: 20 }}
                                        onClick={() => onStageClick?.(stage.name)}
                                        className={`
                        relative z-10 w-10 h-10 rounded-full border-[2.5px] flex items-center justify-center transition-all duration-300
                        ${statusColors[stage.status]}
                        ${isActive ? 'scale-125 shadow-lg shadow-blue-200/50' : ''}
                        hover:scale-110
                    `}
                                    >
                                        <Icon
                                            size={isActive || isSuccess || isFailed ? 18 : 14}
                                            strokeWidth={3}
                                            className={isActive ? 'animate-spin' : ''}
                                        />
                                    </motion.button>

                                    {/* Floating Label */}
                                    <div className={`
                    absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-bold tracking-wide transition-colors duration-300
                    ${isActive ? 'text-blue-600' : ''}
                    ${isSuccess ? 'text-green-600' : ''}
                    ${isFailed ? 'text-red-500' : ''}
                    ${isPending ? 'text-slate-400' : ''}
                  `}>
                                        {stage.name}
                                    </div>

                                    {/* Tooltip on Hover */}
                                    {stage.duration && (
                                        <div className="absolute top-12 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white text-[10px] py-1 px-2 rounded shadow-xl whitespace-nowrap z-20 pointer-events-none">
                                            {stage.duration}
                                        </div>
                                    )}
                                </div>

                                {/* Connecting Line */}
                                {!isLast && (
                                    <div className="w-16 h-[3px] bg-slate-100 relative overflow-hidden -mx-1 z-0">
                                        {/* Fill Line Animation */}
                                        {(isSuccess || isActive) && (
                                            <motion.div
                                                initial={{ width: "0%" }}
                                                animate={{ width: "100%" }}
                                                transition={{ duration: 0.5, delay: index * 0.1 }}
                                                className={`h-full ${isSuccess ? 'bg-green-500' : 'bg-blue-200'}`}
                                            />
                                        )}
                                    </div>
                                )}
                            </React.Fragment>
                        );
                    })}
                </AnimatePresence>
            </div>
        </div>
    );
}
