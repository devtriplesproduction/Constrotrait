import React from 'react';
import { JobStage } from '@/config/jobTransitions';
import { Check, Circle, Clock } from 'lucide-react';

const STAGES: { id: JobStage; label: string }[] = [
  { id: 'pending', label: 'Pending' },
  { id: 'assigned', label: 'Assigned' },
  { id: 'accepted', label: 'Accepted' },
  { id: 'in_testing', label: 'In Testing' },
  { id: 'report_uploaded', label: 'Report Uploaded' },
  { id: 'in_review', label: 'In Review' },
  { id: 'approved', label: 'Approved' }
];

export function JobStageStepper({ currentStage, isRejected }: { currentStage: JobStage | 'rejected'; isRejected?: boolean }) {
  const actualStage = currentStage === 'rejected' ? 'in_review' : currentStage;
  const isActualRejected = isRejected || currentStage === 'rejected';
  const currentIndex = STAGES.findIndex(s => s.id === actualStage);
  
  return (
    <div className="w-full relative px-2 sm:px-6 py-8">
      {/* Background connecting line */}
      <div className="absolute top-1/2 left-0 right-0 h-1.5 -translate-y-1/2 bg-slate-100 rounded-full mx-8 sm:mx-14 z-0" />
      
      {/* Active connecting line */}
      <div 
        className="absolute top-1/2 left-0 h-1.5 -translate-y-1/2 bg-gradient-to-r from-indigo-500 via-purple-500 to-orange-400 rounded-full transition-all duration-700 ease-in-out z-0 ml-8 sm:ml-14"
        style={{ 
          width: `calc(${Math.max(0, currentIndex) / (STAGES.length - 1) * 100}% - 4rem)`,
          boxShadow: '0 0 10px rgba(99, 102, 241, 0.4)' 
        }} 
      />

      <div className="relative z-10 flex justify-between items-center w-full">
        {STAGES.map((stage, index) => {
          const isPast = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isFuture = index > currentIndex;
          
          let ringColor = 'ring-slate-200';
          let bgColor = 'bg-white';
          let iconColor = 'text-slate-300';
          
          if (isPast) {
            ringColor = 'ring-indigo-500';
            bgColor = 'bg-indigo-500';
            iconColor = 'text-white';
          } else if (isCurrent) {
            if (isActualRejected) {
              ringColor = 'ring-red-400 ring-offset-4';
              bgColor = 'bg-red-500';
              iconColor = 'text-white';
            } else {
              ringColor = 'ring-orange-400 ring-offset-4';
              bgColor = 'bg-gradient-to-br from-orange-400 to-pink-500';
              iconColor = 'text-white';
            }
          }
          
          return (
            <div key={stage.id} className="flex flex-col items-center group relative">
              {/* Step indicator */}
              <div 
                className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center ring-2 ${ringColor} ${bgColor} shadow-sm transition-all duration-300 ${isCurrent ? 'scale-110 shadow-lg' : isFuture ? 'hover:scale-105' : ''}`}
              >
                {isPast ? (
                  <Check className={`w-5 h-5 sm:w-6 sm:h-6 ${iconColor}`} />
                ) : isCurrent ? (
                  isActualRejected ? (
                    <div className={`w-4 h-4 sm:w-5 sm:h-5 ${iconColor}`}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></div>
                  ) : (
                    <div className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-white animate-pulse shadow-[0_0_8px_rgba(255,255,255,0.8)]`} />
                  )
                ) : (
                  <Circle className={`w-4 h-4 sm:w-5 sm:h-5 ${iconColor}`} />
                )}
              </div>
              
              {/* Label below */}
              <div className="absolute top-14 sm:top-16 flex flex-col items-center min-w-[90px]">
                <span className={`text-[10px] sm:text-xs text-center font-medium transition-colors duration-300 ${isCurrent ? 'text-slate-800 font-bold' : isPast ? 'text-indigo-700' : 'text-slate-400'}`}>
                  {stage.label}
                </span>
                {isCurrent && isActualRejected && (
                  <span className="inline-block px-1.5 py-0.5 mt-1 rounded text-[9px] bg-red-100 text-red-600 font-bold uppercase tracking-wider">
                    Rejected
                  </span>
                )}
                {isCurrent && !isActualRejected && (
                  <span className="inline-block mt-1 w-1.5 h-1.5 rounded-full bg-orange-400 animate-bounce" />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
