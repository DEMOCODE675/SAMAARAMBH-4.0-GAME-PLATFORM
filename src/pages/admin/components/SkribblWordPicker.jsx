import React, { useState, useEffect } from 'react';
import { getRandomWords } from '../../../utils/skribblWordBank';

export default function SkribblWordPicker({ onSelectWord }) {
  const [words, setWords] = useState([]);
  const [customWord, setCustomWord] = useState('');

  useEffect(() => {
    setWords(getRandomWords(3));
  }, []);

  const handleRefresh = () => {
    setWords(getRandomWords(3));
  };

  const handleSelect = (w) => {
    onSelectWord(w.toLowerCase());
  };

  const handleCustomSubmit = (e) => {
    e.preventDefault();
    if (customWord.trim()) {
      handleSelect(customWord.trim());
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
      <h3 className="text-xl font-bold text-white mb-4">Choose a word</h3>
      <div className="flex gap-4 mb-6">
        {words.map(w => (
          <button 
            key={w} 
            onClick={() => handleSelect(w)}
            className="flex-1 bg-slate-800 hover:bg-rose-500 hover:text-white transition-colors border border-slate-700 py-3 rounded-xl font-semibold text-slate-200"
          >
            {w}
          </button>
        ))}
      </div>
      
      <div className="flex items-center gap-4">
        <button onClick={handleRefresh} className="text-slate-400 hover:text-white text-sm">
          Refresh words
        </button>
        <span className="text-slate-600">or</span>
        <form onSubmit={handleCustomSubmit} className="flex-1 flex gap-2">
          <input 
            type="text" 
            placeholder="Type custom word..." 
            value={customWord}
            onChange={e => setCustomWord(e.target.value)}
            className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-rose-500"
          />
          <button type="submit" className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-lg font-bold">
            Use
          </button>
        </form>
      </div>
    </div>
  );
}
