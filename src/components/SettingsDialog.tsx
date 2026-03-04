import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Volume2, Music, Palette } from 'lucide-react';

interface SettingsDialogProps {
    isOpen: boolean;
    onClose: () => void;
    theme: string;
    onThemeChange: (theme: any) => void;
    volume: number;
    onVolumeChange: (val: number) => void;
    musicEnabled: boolean;
    onMusicToggle: (val: boolean) => void;
    sfxEnabled: boolean;
    onSfxToggle: (val: boolean) => void;
    selectedMusic: string;
    onMusicChange: (val: string) => void;
}

const SettingsDialog: React.FC<SettingsDialogProps> = ({
    isOpen,
    onClose,
    theme,
    onThemeChange,
    volume,
    onVolumeChange,
    musicEnabled,
    onMusicToggle,
    sfxEnabled,
    onSfxToggle,
    selectedMusic,
    onMusicChange,
}) => {
    const themes = [
        { id: 'neon', label: 'Neon Space', color: '#00f2fe' },
        { id: 'avalanche', label: 'Avalanche', color: '#E84142' },
        { id: 'gold', label: 'Cyber Gold', color: '#ffb400' },
        { id: 'midnight', label: 'Deep Sea', color: '#00ff88' },
    ];

    const musicTracks = [
        { id: 'synth_wave', label: 'Neon Pulsar (Synth)' },
        { id: 'lofi_chill', label: 'Orbit Chill (Lo-Fi)' },
        { id: 'high_energy', label: 'Hyperdrive (Energy)' },
        { id: 'stand_up', label: 'Stand Up (Victory)' },
    ];

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent
                className="sm:max-w-[450px] glass-panel border-white/20 text-white backdrop-blur-3xl rounded-[2rem] p-8 shadow-2xl"
                style={{ backgroundColor: 'rgba(135, 206, 235, 0.95)', border: '1px solid rgba(255, 255, 255, 0.3)' }}
            >
                <DialogHeader className="mb-6">
                    <DialogTitle className="text-3xl font-black italic tracking-tighter text-indigo-950 flex items-center gap-3 drop-shadow-sm">
                        MISSION CONTROL
                    </DialogTitle>
                    <DialogDescription className="text-slate-900 font-mono-game uppercase tracking-[0.2em] text-[10px] font-bold">
                        Adjust your tactical experience
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-8">
                    {/* Theme Section */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-4 text-indigo-950">
                            <Palette className="w-5 h-5 drop-shadow-sm" />
                            <Label className="text-xs font-mono-game uppercase tracking-[0.2em] font-black">Visual Theme</Label>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            {themes.map((t) => (
                                <button
                                    key={t.id}
                                    onClick={() => onThemeChange(t.id)}
                                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all hover:bg-white/5 ${theme === t.id ? 'border-primary bg-primary/10' : 'border-white/5 bg-transparent'
                                        }`}
                                >
                                    <div className="w-3 h-3 rounded-full shadow-[0_0_8px_currentColor]" style={{ backgroundColor: t.color, color: t.color }} />
                                    <span className="text-[10px] font-mono-game uppercase tracking-widest text-indigo-950 font-black">{t.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="h-px bg-white/5" />

                    {/* Audio Section */}
                    <div className="space-y-5">
                        <div className="flex items-center gap-4 text-indigo-950">
                            <Volume2 className="w-5 h-5 drop-shadow-sm" />
                            <Label className="text-xs font-mono-game uppercase tracking-[0.2em] font-black">Audio Profile</Label>
                        </div>

                        <div className="space-y-6 px-2">
                            <div className="space-y-3">
                                <div className="flex justify-between text-[10px] font-mono-game uppercase tracking-widest text-slate-900 font-black">
                                    <span>Master Volume</span>
                                    <span>{Math.round(volume * 100)}%</span>
                                </div>
                                <Slider
                                    value={[volume * 100]}
                                    max={100}
                                    step={1}
                                    onValueChange={(val) => onVolumeChange(val[0] / 100)}
                                    className="py-4"
                                />
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex flex-col gap-1">
                                    <span className="text-[11px] font-black text-slate-900 uppercase tracking-wider">Background Music</span>
                                    <span className="text-[9px] text-slate-700 uppercase tracking-widest font-mono font-bold">Ambient score</span>
                                </div>
                                <Switch checked={musicEnabled} onCheckedChange={onMusicToggle} />
                            </div>

                            {musicEnabled && (
                                <div className="pt-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                    <Select value={selectedMusic} onValueChange={onMusicChange}>
                                        <SelectTrigger className="glass-panel border-white/10 text-white h-10 text-[10px] font-mono uppercase tracking-widest">
                                            <div className="flex items-center gap-2">
                                                <Music className="w-3 h-3 text-secondary" />
                                                <SelectValue placeholder="Select Track" />
                                            </div>
                                        </SelectTrigger>
                                        <SelectContent
                                            className="glass-panel border-white/20 text-white"
                                            style={{ backgroundColor: 'rgb(14, 165, 233)', border: '1px solid rgba(255, 255, 255, 0.3)' }}
                                        >
                                            {musicTracks.map(track => (
                                                <SelectItem key={track.id} value={track.id} className="text-[10px] font-mono uppercase tracking-widest focus:text-primary focus:bg-white/5">
                                                    {track.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            <div className="flex items-center justify-between">
                                <div className="flex flex-col gap-1">
                                    <span className="text-[11px] font-black text-slate-900 uppercase tracking-wider">Sound Effects (SFX)</span>
                                    <span className="text-[9px] text-slate-700 uppercase tracking-widest font-mono font-bold">Tactile feedback</span>
                                </div>
                                <Switch checked={sfxEnabled} onCheckedChange={onSfxToggle} />
                            </div>
                        </div>
                    </div>

                    <div className="h-px bg-white/5" />

                    {/* Gameplay Section (Placeholders for future) */}

                </div>
            </DialogContent>
        </Dialog>
    );
};

export default SettingsDialog;
