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
import { Volume2, Music, Palette, Zap, Info } from 'lucide-react';

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
    ];

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[450px] glass-panel border-white/10 bg-sky-400/90 text-white backdrop-blur-2xl rounded-[2rem] p-8 shadow-2xl">
                <DialogHeader className="mb-6">
                    <DialogTitle className="text-3xl font-black italic tracking-tighter text-primary text-glow-theme flex items-center gap-3">
                        MISSION CONTROL
                    </DialogTitle>
                    <DialogDescription className="text-white/40 font-mono-game uppercase tracking-[0.2em] text-[10px]">
                        Adjust your tactical experience
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-8">
                    {/* Theme Section */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-4 text-primary">
                            <Palette className="w-5 h-5 shadow-glow-theme" />
                            <Label className="text-xs font-mono-game uppercase tracking-[0.2em] font-bold">Visual Theme</Label>
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
                                    <span className="text-[10px] font-mono-game uppercase tracking-widest">{t.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="h-px bg-white/5" />

                    {/* Audio Section */}
                    <div className="space-y-5">
                        <div className="flex items-center gap-4 text-primary">
                            <Volume2 className="w-5 h-5 shadow-glow-theme" />
                            <Label className="text-xs font-mono-game uppercase tracking-[0.2em] font-bold">Audio Profile</Label>
                        </div>

                        <div className="space-y-6 px-2">
                            <div className="space-y-3">
                                <div className="flex justify-between text-[10px] font-mono-game uppercase tracking-widest text-white/60">
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
                                    <span className="text-[11px] font-bold text-white uppercase tracking-wider">Background Music</span>
                                    <span className="text-[9px] text-white/30 uppercase tracking-widest font-mono">Ambient score</span>
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
                                        <SelectContent className="glass-panel border-white/10 text-white bg-sky-500/95">
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
                                    <span className="text-[11px] font-bold text-white uppercase tracking-wider">Sound Effects (SFX)</span>
                                    <span className="text-[9px] text-white/30 uppercase tracking-widest font-mono">Tactile feedback</span>
                                </div>
                                <Switch checked={sfxEnabled} onCheckedChange={onSfxToggle} />
                            </div>
                        </div>
                    </div>

                    <div className="h-px bg-white/5" />

                    {/* Gameplay Section (Placeholders for future) */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-4 text-primary">
                            <Zap className="w-5 h-5 shadow-glow-theme" />
                            <Label className="text-xs font-mono-game uppercase tracking-[0.2em] font-bold">Gameplay</Label>
                        </div>
                        <div className="grid grid-cols-2 gap-3 opacity-50 cursor-not-allowed">
                            <div className="flex items-center justify-between p-3 rounded-xl border border-white/5 bg-transparent">
                                <span className="text-[10px] font-mono-game uppercase tracking-widest">Fast Animations</span>
                                <Info className="w-3 h-3 text-white/20" />
                            </div>
                            <div className="flex items-center justify-between p-3 rounded-xl border border-white/5 bg-transparent">
                                <span className="text-[10px] font-mono-game uppercase tracking-widest">Show Hints</span>
                                <Info className="w-3 h-3 text-white/20" />
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default SettingsDialog;
