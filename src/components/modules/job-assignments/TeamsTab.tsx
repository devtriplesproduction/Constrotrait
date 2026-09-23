"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Users, X, Trash2 } from "lucide-react";
import { createTeamAction, addTeamMemberAction, removeTeamMemberAction } from "@/actions/team.actions";

export function TeamsTab({ initialTeams, employees }: { initialTeams: any[], employees: any[] }) {
  const [teams, setTeams] = useState(initialTeams);
  const [isCreating, setIsCreating] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamDesc, setNewTeamDesc] = useState("");
  const [loading, setLoading] = useState(false);

  // For adding members
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");

  const handleCreateTeam = async () => {
    if (!newTeamName) return;
    setLoading(true);
    const res = await createTeamAction({ name: newTeamName, description: newTeamDesc });
    if (res.success) {
      setTeams([{ ...res.data, team_members: [] }, ...teams]);
      setIsCreating(false);
      setNewTeamName("");
      setNewTeamDesc("");
    } else {
      alert("Error: " + res.error);
    }
    setLoading(false);
  };

  const handleAddMember = async (teamId: string) => {
    if (!selectedEmployeeId) return;
    setLoading(true);
    const res = await addTeamMemberAction(teamId, selectedEmployeeId);
    if (res.success) {
      // Find employee details to update state locally
      const emp = employees.find(e => e.id === selectedEmployeeId);
      const newMember = { ...res.data, profiles: emp };
      
      setTeams(teams.map(t => {
        if (t.id === teamId) {
          return { ...t, team_members: [...(t.team_members || []), newMember] };
        }
        return t;
      }));
      setSelectedEmployeeId("");
      setSelectedTeamId(null);
    } else {
      alert("Error: " + res.error);
    }
    setLoading(false);
  };

  const handleRemoveMember = async (teamId: string, employeeId: string) => {
    if (!confirm("Are you sure?")) return;
    setLoading(true);
    const res = await removeTeamMemberAction(teamId, employeeId);
    if (res.success) {
      setTeams(teams.map(t => {
        if (t.id === teamId) {
          return { ...t, team_members: (t.team_members || []).filter((m: any) => m.employee_id !== employeeId) };
        }
        return t;
      }));
    } else {
      alert("Error: " + res.error);
    }
    setLoading(false);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
          <Users className="w-5 h-5 text-orange-500" />
          Manage Teams
        </h2>
        <Button onClick={() => setIsCreating(true)} className="bg-orange-500 hover:bg-orange-600">
          <Plus className="w-4 h-4 mr-2" />
          Create Team
        </Button>
      </div>

      {isCreating && (
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6">
          <h3 className="font-medium text-slate-800 mb-4">New Team</h3>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm text-slate-600 mb-1">Team Name</label>
              <Input 
                value={newTeamName} 
                onChange={(e) => setNewTeamName(e.target.value)} 
                placeholder="Enter team name"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm text-slate-600 mb-1">Description</label>
              <Input 
                value={newTeamDesc} 
                onChange={(e) => setNewTeamDesc(e.target.value)} 
                placeholder="Optional description"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsCreating(false)}>Cancel</Button>
              <Button onClick={handleCreateTeam} disabled={loading || !newTeamName} className="bg-orange-500 hover:bg-orange-600">
                Save
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {teams.map((team: any) => (
          <div key={team.id} className="border border-slate-200 rounded-xl p-5 bg-white shadow-sm flex flex-col">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-semibold text-lg text-slate-800">{team.name}</h3>
                {team.description && <p className="text-sm text-slate-500">{team.description}</p>}
              </div>
            </div>

            <div className="flex-1">
              <h4 className="text-sm font-medium text-slate-700 mb-2">Members ({team.team_members?.length || 0})</h4>
              <ul className="space-y-2 mb-4">
                {team.team_members?.map((member: any) => (
                  <li key={member.id} className="flex justify-between items-center bg-slate-50 p-2 rounded-lg text-sm border border-slate-100">
                    <span className="text-slate-700">
                      {member.profiles?.first_name} {member.profiles?.last_name}
                    </span>
                    <button 
                      onClick={() => handleRemoveMember(team.id, member.employee_id)}
                      className="text-red-400 hover:text-red-600"
                      disabled={loading}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {selectedTeamId === team.id ? (
              <div className="flex gap-2 mt-auto">
                <select 
                  className="flex h-9 w-full rounded-md border border-slate-200 bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950"
                  value={selectedEmployeeId}
                  onChange={(e) => setSelectedEmployeeId(e.target.value)}
                >
                  <option value="">Select Employee</option>
                  {employees
                    .filter(e => !(team.team_members || []).find((m: any) => m.employee_id === e.id))
                    .map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</option>
                  ))}
                </select>
                <Button size="sm" onClick={() => handleAddMember(team.id)} disabled={!selectedEmployeeId || loading}>Add</Button>
                <Button size="sm" variant="outline" onClick={() => setSelectedTeamId(null)}><X className="w-4 h-4"/></Button>
              </div>
            ) : (
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full mt-auto"
                onClick={() => setSelectedTeamId(team.id)}
              >
                <Plus className="w-4 h-4 mr-2" /> Add Member
              </Button>
            )}
          </div>
        ))}
        {teams.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-500">
            No teams found. Create one to get started.
          </div>
        )}
      </div>
    </div>
  );
}
