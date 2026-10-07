import React from 'react';
import { JobStage } from '@/config/jobTransitions';
import { Check, Clock, UserCheck, ThumbsUp, Beaker, UploadCloud, Search, CheckCircle2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/ScrollArea';

const STAGES: { id: JobStage; label: string; desc: string; icon: React.ElementType }[] = [
  { id: 'pending', label: 'Pending', desc: 'Job is pending', icon: Clock },
  { id: 'assigned', label: 'Assigned', desc: 'Assigned to analyst', icon: UserCheck },
  { id: 'accepted', label: 'Accepted', desc: 'Test request accepted', icon: ThumbsUp },
  { id: 'in_testing', label: 'In Testing', desc: 'Testing in progress', icon: Beaker },
  { id: 'report_uploaded', label: 'Report Uploaded', desc: 'Report file uploaded', icon: UploadCloud },
  { id: 'in_review', label: 'In Review', desc: 'Under review', icon: Search },
  { id: 'approved', label: 'Approved', desc: 'Final approval', icon: CheckCircle2 }
];

export function JobStageStepper({ 
  currentStage, 
  isRejected, 
  orientation = 'vertical' 
}: { 
  currentStage: JobStage | 'rejected'; 
  isRejected?: boolean;
  orientation?: 'vertical' | 'horizontal';
}) {
  const actualStage = currentStage === 'rejected' ? 'in_review' : currentStage;
  const isActualRejected = isRejected || currentStage === 'rejected';
  const currentIndex = STAGES.findIndex(s => s.id === actualStage);
  
  const isHorizontal = orientation === 'horizontal';

  if (isHorizontal) {
    return (
      <ScrollArea orientation="horizontal" className="flex w-full items-center font-sans pb-4 pt-4 px-2 snap-x">
        {STAGES.map((stage, index) => {
          const isPast = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isLast = index === STAGES.length - 1;
          const isActive = isPast || isCurrent;

          let cardClasses = "relative flex flex-col items-center justify-center p-3 bg-white rounded-2xl shadow-[0_4px_16px_rgba(0,0,0,0.04)] border transition-all duration-300 min-h-[120px] min-w-[120px] shrink-0 snap-center ";
          
          if (isCurrent && isActualRejected) {
             cardClasses += "border-red-200/60";
          } else if (isActive) {
             cardClasses += "border-orange-100 shadow-[0_4px_20px_rgba(249,115,22,0.06)] scale-[1.02] z-10";
          } else {
             cardClasses += "border-slate-100/60";
          }

          return (
            <React.Fragment key={stage.id}>
              {/* Card */}
              <div className={cardClasses}>
                
                {/* Top Badge */}
                <div className={`absolute -top-3 left-1/2 -translate-x-1/2 w-9 h-5 rounded-md flex items-center justify-center z-10 transition-colors ${
                  (isCurrent && isActualRejected) ? 'bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.5)]' :
                  isActive ? 'bg-gradient-to-r from-orange-400 to-orange-300 shadow-[0_0_12px_rgba(251,146,60,0.5)]' : 'bg-slate-300 shadow-sm'
                }`}>
                  <span className="text-white text-[12px] font-bold">{index + 1}</span>
                </div>

                {/* Inner Glow */}
                <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-20 h-12 blur-[16px] rounded-full transition-opacity ${
                  (isCurrent && isActualRejected) ? 'bg-red-500/25 opacity-100' :
                  isActive ? 'bg-orange-400/30 opacity-100' : 'opacity-0'
                }`} />

                {/* Icon */}
                <div className={`mb-3 z-10 transition-colors ${
                  (isCurrent && isActualRejected) ? 'text-red-500' :
                  isActive ? 'text-orange-400' : 'text-slate-300'
                }`}>
                  <stage.icon className="w-6 h-6" strokeWidth={isActive ? 2 : 1.5} />
                </div>

                {/* Text */}
                <div className="z-10 text-center flex flex-col items-center gap-1.5">
                  <span className={`text-[11px] font-extrabold uppercase tracking-widest transition-colors ${
                    (isCurrent && isActualRejected) ? 'text-red-600' :
                    isActive ? 'text-slate-800' : 'text-slate-400'
                  }`}>{stage.label}</span>
                  <span className="text-[9px] text-slate-400 leading-tight max-w-[90px] text-center">{stage.desc}</span>
                </div>
                
                {/* Rejected specific badge */}
                {isCurrent && isActualRejected && (
                  <div className="absolute -bottom-2.5 bg-red-100 border border-red-200 text-red-600 text-[9px] font-bold uppercase px-2 py-0.5 rounded shadow-sm z-10 tracking-widest">
                    Rejected
                  </div>
                )}
              </div>

              {/* Arrow separator */}
              {!isLast && (
                <div className={`flex-shrink-0 mx-2 lg:mx-3 transition-colors ${
                  isPast ? 'text-orange-300 drop-shadow-[0_0_2px_rgba(251,146,60,0.4)]' : 'text-slate-200'
                }`}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                     <path d="M4 12H20M20 12L13 5M20 12L13 19" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </ScrollArea>
    );
  }

  return (
    <div className="flex w-full font-sans flex-col">
      {STAGES.map((stage, index) => {
        const isPast = index < currentIndex;
        const isCurrent = index === currentIndex;
        const isLast = index === STAGES.length - 1;
        
        // Define styles
        let circleClasses = "w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-[2px] bg-white transition-all duration-500 ";
        let titleClasses = "font-bold text-[13px] leading-tight mt-1 transition-colors duration-300 ";
        
        let circleContent = null;
        
        if (isPast || isCurrent) {
          if (isCurrent && isActualRejected) {
            circleClasses += "bg-red-50 border-red-500 text-red-500 shadow-[0_0_0_4px_rgba(239,68,68,0.15)]";
            titleClasses += "text-red-600";
            circleContent = <stage.icon className="w-4 h-4" strokeWidth={2.5} />;
          } else if (isPast) {
            circleClasses += "bg-orange-500 border-orange-500 text-white shadow-sm";
            titleClasses += "text-slate-700";
            circleContent = <Check className="w-4 h-4" strokeWidth={3} />;
          } else {
            // isCurrent and not rejected
            circleClasses += "bg-orange-50 border-orange-500 text-orange-600 shadow-[0_0_0_4px_rgba(249,115,22,0.15)] scale-110";
            titleClasses += "text-orange-600";
            circleContent = <stage.icon className="w-4 h-4" strokeWidth={2.5} />;
          }
        } else {
          circleClasses += "border-slate-200 text-slate-400 bg-slate-50";
          titleClasses += "text-slate-400";
          circleContent = <stage.icon className="w-4 h-4" strokeWidth={2} />;
        }
        
        return (
          <div key={stage.id} className="flex relative gap-4">
            {/* Connecting Line */}
            {!isLast && (
              <div className="absolute bg-slate-200/60 rounded-full w-[3px] left-[15px] top-8 bottom-[-8px] -z-10">
                <div className="bg-orange-500 rounded-full transition-all duration-500 w-full" style={{
                  height: (isPast ? '100%' : '0%'),
                }} />
              </div>
            )}
            
            {/* Circle */}
            <div className="relative z-10 flex-shrink-0 mt-0.5 bg-white rounded-full p-0.5">
              <div className={circleClasses}>
                {circleContent}
              </div>
            </div>
            
            {/* Text */}
            <div className="pb-6 pt-1">
              <p className={titleClasses}>{stage.label}</p>
              <p className="text-xs text-slate-400 leading-tight mt-0.5">{stage.desc}</p>
              {isCurrent && isActualRejected && (
                <p className="text-[10px] text-red-600 font-bold uppercase mt-1.5 tracking-wider bg-red-100 inline-block px-2 py-0.5 rounded-md">Rejected</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

