import React, { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { db } from '../../config/firebase';
import { doc, getDoc, setDoc, updateDoc, onSnapshot, collection, query, where } from 'firebase/firestore';

export default function TeamLobby({ onBack }) {
  const { player } = useContext(AuthContext);

  const [joinCode, setJoinCode] = useState('');
  const [teamName, setTeamName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Live state for the team room
  const [activeTeam, setActiveTeam] = useState(null);
  const [roster, setRoster] = useState([]);

  // Listen for team updates if the player is in a team
  useEffect(() => {
    if (!player?.teamCode) return;

    // 1. Listen to the Team Document
    const teamRef = doc(db, 'events', 'samarambh', 'teams', player.teamCode);
    const unsubscribeTeam = onSnapshot(teamRef, (docSnap) => {
      if (docSnap.exists()) setActiveTeam(docSnap.data());
    });

    // 2. Listen to all players who have this teamCode
    const playersRef = collection(db, 'players');
    const q = query(playersRef, where("teamCode", "==", player.teamCode));
    const unsubscribeRoster = onSnapshot(q, (querySnapshot) => {
      const teammates = [];
      querySnapshot.forEach((doc) => teammates.push(doc.data()));
      setRoster(teammates);
    });

    return () => {
      unsubscribeTeam();
      unsubscribeRoster();
    };
  }, [player?.teamCode]);

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (teamName.length < 3) throw new Error("Team name too short.");

      const code = Math.random().toString(36).substring(2, 6).toUpperCase();
      
      const teamRef = doc(db, 'events', 'samarambh', 'teams', code);
      await setDoc(teamRef, {
        teamName: teamName,
        teamCode: code,
        leaderPin: player.pin,
        totalScore: 0,
        createdAt: new Date()
      });

      const playerRef = doc(db, 'players', player.pin);
      await updateDoc(playerRef, { teamCode: code, isLeader: true });

      window.location.reload(); 
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinTeam = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const code = joinCode.toUpperCase();
      const teamRef = doc(db, 'events', 'samarambh', 'teams', code);
      const docSnap = await getDoc(teamRef);

      if (!docSnap.exists()) throw new Error("Team code not found.");

      const playerRef = doc(db, 'players', player.pin);
      await updateDoc(playerRef, { teamCode: code, isLeader: false });

      window.location.reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // VIEW 1: THE ACTIVE SQUAD ROOM (In a Team)
  // ==========================================
  if (player?.teamCode && activeTeam) {
    return (
      <div className="min-h-screen bg-black text-green-400 font-mono flex flex-col items-center p-6 pt-12">
        <h2 className="text-gray-400 text-sm uppercase tracking-widest">Active Squad</h2>
        <h1 className="text-4xl font-bold text-cyan-400 mt-2 mb-6">{activeTeam.teamName}</h1>
        
        <div className="w-full max-w-md border-2 border-dashed border-green-700 bg-green-950/20 p-5 rounded-xl text-center mb-6">
          <p className="text-gray-400 text-xs mb-1 uppercase">Squad Invite Code</p>
          <p className="text-4xl font-extrabold text-green-400 tracking-[0.2em]">{activeTeam.teamCode}</p>
        </div>

        <div className="w-full max-w-md bg-gray-900 border border-gray-700 rounded-xl overflow-hidden mb-6">
          <div className="bg-gray-800 p-3 px-4 border-b border-gray-700 flex justify-between items-center text-sm">
            <span className="font-bold text-white">Squad Roster</span>
            <span className="text-cyan-400">{roster.length} Players</span>
          </div>
          <ul className="divide-y divide-gray-800 max-h-40 overflow-y-auto">
            {roster.map((member) => (
              <li key={member.pin} className="p-3 px-4 flex items-center justify-between text-gray-300 text-sm">
                <span>{member.isLeader ? '👑' : '👤'} {member.name} {member.pin === player.pin && "(You)"}</span>
              </li>
            ))}
          </ul>
        </div>
        
        <p className="text-yellow-400 animate-pulse text-xs mb-6 uppercase tracking-wider">Awaiting host deployment...</p>

        {/* 🚀 BACK TO SOLO DASHBOARD BUTTON */}
        <div className="w-full max-w-md space-y-3">
          <button 
            onClick={onBack}
            className="w-full bg-transparent border-2 border-gray-700 text-gray-300 font-bold py-3 rounded hover:bg-gray-900 transition-colors uppercase tracking-wider text-xs"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW 2: CREATE OR JOIN FORMS
  // ==========================================
  return (
    <div className="min-h-screen bg-black text-green-400 font-mono flex flex-col items-center justify-center p-6">
      <h1 className="text-3xl font-bold text-cyan-400 mb-8 uppercase tracking-wider">Squad Management</h1>
      
      <div className="w-full max-w-sm space-y-6">
        {/* Create Team Form */}
        <form onSubmit={handleCreateTeam} className="bg-gray-900 border border-green-800 p-6 rounded-xl shadow-[0_0_15px_rgba(34,197,94,0.1)]">
          <h2 className="text-white font-bold mb-4 uppercase text-sm">Create a Squad</h2>
          <input 
            type="text" 
            placeholder="Squad Name..."
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            className="w-full bg-black border border-green-600 focus:border-cyan-400 outline-none px-4 py-3 text-white rounded mb-4 text-sm"
            required
          />
          <button disabled={loading} type="submit" className="w-full bg-green-600 text-black font-extrabold py-3 rounded hover:bg-green-500 uppercase tracking-widest text-xs">
            Generate Code
          </button>
        </form>

        <div className="text-center text-gray-500 uppercase tracking-widest text-xs">- OR -</div>

        {/* Join Team Form */}
        <form onSubmit={handleJoinTeam} className="bg-gray-900 border border-cyan-800 p-6 rounded-xl shadow-[0_0_15px_rgba(34,211,153,0.1)]">
          <h2 className="text-white font-bold mb-4 uppercase text-sm">Join with Code</h2>
          <input 
            type="text" 
            placeholder="4-Letter Code"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            className="w-full bg-black border border-cyan-600 focus:border-cyan-400 outline-none px-4 py-3 text-white rounded mb-4 text-center uppercase tracking-widest font-bold text-xl"
            maxLength={4}
            required
          />
          <button disabled={loading} type="submit" className="w-full bg-cyan-600 text-black font-extrabold py-3 rounded hover:bg-cyan-500 uppercase tracking-widest text-xs">
            Join Squad
          </button>
        </form>

        {error && <p className="text-red-500 text-center text-xs">{error}</p>}

        <button 
          onClick={onBack} 
          className="w-full text-center text-gray-500 hover:text-cyan-400 text-xs uppercase tracking-widest underline decoration-gray-700 underline-offset-4 pt-2"
        >
          ← Back to Dashboard
        </button>
      </div> 
    </div>
  );
}