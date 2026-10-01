import React from 'react';
import { JobStage } from '@/config/jobTransitions';
import { Check } from 'lucide-react';

const STAGES: { id: JobStage; label: string; desc: string }[] = [
  { id: 'pending', label: 'Pending', desc: 'Job is pending' },
  { id: 'assigned', label: 'Assigned', desc: 'Assigned to analyst' },
  { id: 'accepted', label: 'Accepted', desc: 'Test request accepted' },
  { id: 'in_testing', label: 'In Testing', desc: 'Testing in progress' },
  { id: 'report_uploaded', label: 'Report Uploaded', desc: 'Report file uploaded' },
  { id: 'in_review', label: 'In Review', desc: 'Under review' },
  { id: 'approved', label: 'Approved', desc: 'Final approval' }
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

  return (
    <div className={`flex w-full font-sans ${isHorizontal ? 'flex-row items-start' : 'flex-col'}`}>
      {STAGES.map((stage, index) => {
        const isPast = index < currentIndex;
        const isCurrent = index === currentIndex;
        const isLast = index === STAGES.length - 1;
        
        // Define styles
        let circleClasses = "w-6 h-6 rounded-full flex items-center justify-center shrink-0 border-[1.5px] bg-white transition-all duration-300 ";
        let titleClasses = "font-bold text-xs leading-tight mt-1 ";
        
        let circleContent = null;
        
        if (isPast || isCurrent) {
          if (isCurrent && isActualRejected) {
            circleClasses += "bg-red-500 border-red-500 text-white shadow-[0_0_10px_rgba(239,68,68,0.3)]";
            titleClasses += "text-red-600";
            circleContent = <Check className="w-3.5 h-3.5" strokeWidth={4} />;
          } else {
            circleClasses += "bg-gradient-to-tr from-orange-600 to-orange-400 border-orange-500 text-white shadow-[0_0_10px_rgba(249,115,22,0.3)]";
            titleClasses += isCurrent ? "text-orange-600" : "text-slate-800";
            circleContent = <Check className="w-3.5 h-3.5" strokeWidth={4} />;
          }
        } else {
          circleClasses += "border-slate-300 text-transparent";
          titleClasses += "text-slate-500";
        }
        
        return (
          <div key={stage.id} className={`flex relative ${isHorizontal ? 'flex-col items-center flex-1' : 'gap-4'}`}>
            {/* Connecting Line */}
            {!isLast && (
              <div className={`absolute bg-slate-200 ${
                isHorizontal 
                  ? 'h-[2px] left-[50%] right-[-50%] top-3 -z-10' 
                  : 'w-[2px] left-[11px] top-6 bottom-[-6px] -z-10'
              }`}>
                <div className={`bg-orange-500 transition-all duration-500 ${
                  isHorizontal ? 'h-full' : 'w-full'
                }`} style={{
                  width: isHorizontal ? (isPast ? '100%' : '0%') : '100%',
                  height: !isHorizontal ? (isPast ? '100%' : '0%') : '100%',
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
            <div className={`${isHorizontal ? 'text-center mt-2 px-1' : 'pb-4'}`}>
              <p className={titleClasses}>{stage.label}</p>
              {!isHorizontal && <p className="text-[11px] text-slate-400 leading-tight mt-0.5">{stage.desc}</p>}
              {isCurrent && isActualRejected && (
                <p className="text-[9px] text-red-500 font-bold uppercase mt-1 tracking-wider bg-red-50 inline-block px-1.5 py-0.5 rounded">Rejected</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

