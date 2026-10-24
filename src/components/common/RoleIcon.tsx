import React from "react";
import {
  ShieldCheck,
  Building2,
  Users,
  Award,
  Wrench,
  UserCheck,
  Calculator,
  FlaskConical,
  Microscope,
  TestTube,
  Layers,
  TrendingUp,
  Share2,
  Briefcase,
} from "lucide-react";

interface RoleIconProps {
  role?: string | null;
  className?: string;
}

export function RoleIcon({ role, className = "w-4 h-4" }: RoleIconProps) {
  switch (role) {
    case "SUPER_ADMIN":
      return <ShieldCheck className={className} />;
    case "BRANCH_MANAGER_ADMINISTRATIVE":
      return <Building2 className={className} />;
    case "HR":
      return <Users className={className} />;
    case "QUALITY_MANAGER":
      return <Award className={className} />;
    case "TECHNICAL_MANAGER":
      return <Wrench className={className} />;
    case "ADMIN_INWARD_CRE":
      return <UserCheck className={className} />;
    case "ACCOUNTANT":
      return <Calculator className={className} />;
    case "TEST_ENGINEER":
      return <FlaskConical className={className} />;
    case "LAB_ANALYST":
      return <Microscope className={className} />;
    case "LAB_ASSISTANT":
      return <TestTube className={className} />;
    case "SAMPLER":
      return <Layers className={className} />;
    case "MARKETING_EXECUTIVE":
      return <TrendingUp className={className} />;
    case "DIGITAL_MARKETING":
      return <Share2 className={className} />;
    default:
      return <Briefcase className={className} />;
  }
}
