import React, { useRef } from 'react';
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
import { Volume2, Music, Palette, Upload, Trash2, ImageIcon } from 'lucide-react';
import { BackgroundMode } from './BackgroundLayer';

export interface CustomTrack {
    name: string;
    url: string;
}

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
    customTracks: CustomTrack[];
    onCustomTrackAdd: (track: CustomTrack) => void;
    onCustomTrackDelete: (index: number) => void;
    background: BackgroundMode;
    onBackgroundChange: (mode: BackgroundMode) => void;
    customWallpaperUrl?: string;
    onCustomWallpaperChange: (url: string) => void;
}

const MAX_DURATION_SECONDS = 300; // 5 minutes

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
    customTracks,
    onCustomTrackAdd,
    onCustomTrackDelete,
    background,
    onBackgroundChange,
    customWallpaperUrl,
    onCustomWallpaperChange,
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const wallpaperInputRef = useRef<HTMLInputElement>(null);

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

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate type
        if (file.type !== 'audio/mpeg' && !file.name.toLowerCase().endsWith('.mp3')) {
            alert('Only MP3 files are allowed.');
            e.target.value = '';
            return;
        }

        // Validate duration
        const url = URL.createObjectURL(file);
        const audio = new Audio(url);
        audio.addEventListener('loadedmetadata', () => {
            if (audio.duration > MAX_DURATION_SECONDS) {
                alert(`Track is too long (${Math.round(audio.duration / 60)} min). Maximum is 5 minutes.`);
                URL.revokeObjectURL(url);
            } else {
                onCustomTrackAdd({ name: file.name.replace(/\.mp3$/i, ''), url });
                onMusicChange(`custom_${customTracks.length}`);
            }
            e.target.value = '';
        });
        audio.addEventListener('error', () => {
            alert('Could not read this file. Please choose a valid MP3.');
            URL.revokeObjectURL(url);
            e.target.value = '';
        });
    };

    const handleDeleteCustomTrack = (index: number) => {
        // If currently playing this track, switch to default
        if (selectedMusic === `custom_${index}`) {
            onMusicChange('synth_wave');
        }
        onCustomTrackDelete(index);
    };

    const bgOptions: { id: BackgroundMode; label: string; preview: string }[] = [
        { id: 'sky', label: 'Default Sky', preview: '☁️' },
        { id: 'galaxy', label: 'Galaxy', preview: '🌌' },
        { id: 'globe', label: 'World Map', preview: '🌍' },
        { id: 'custom', label: 'Custom Image', preview: '🖼️' },
    ];

    const handleWallpaperUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            alert('Please upload a valid image file (JPG, PNG, WebP, etc.).');
            e.target.value = '';
            return;
        }
        const url = URL.createObjectURL(file);
        onCustomWallpaperChange(url);
        onBackgroundChange('custom');
        e.target.value = '';
    };

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
                    {/* Wallpaper / Background Section */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-4 text-indigo-950">
                            <ImageIcon className="w-5 h-5 drop-shadow-sm" />
                            <span className="text-xs font-mono-game uppercase tracking-[0.2em] font-black">Background Wallpaper</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            {bgOptions.map(opt => (
                                <button
                                    key={opt.id}
                                    onClick={() => {
                                        if (opt.id === 'custom') {
                                            wallpaperInputRef.current?.click();
                                        } else {
                                            onBackgroundChange(opt.id);
                                        }
                                    }}
                                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all hover:bg-white/5 ${background === opt.id ? 'border-primary bg-primary/10' : 'border-white/5 bg-transparent'}`}
                                >
                                    <span className="text-base">{opt.preview}</span>
                                    <span className="text-[10px] font-mono-game uppercase tracking-widest text-indigo-950 font-black">{opt.label}</span>
                                </button>
                            ))}
                        </div>
                        {background === 'custom' && customWallpaperUrl && (
                            <div className="flex items-center gap-3 p-2 bg-black/10 rounded-xl border border-white/10">
                                <img src={customWallpaperUrl} alt="Wallpaper preview" className="w-14 h-10 rounded-lg object-cover border border-white/10" />
                                <span className="text-[9px] font-black text-indigo-950 uppercase tracking-widest flex-1 truncate">Custom wallpaper active</span>
                                <button onClick={() => wallpaperInputRef.current?.click()} className="text-[9px] font-black text-indigo-900 underline uppercase tracking-widest">Change</button>
                            </div>
                        )}
                        <input
                            ref={wallpaperInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleWallpaperUpload}
                        />
                    </div>

                    <div className="h-px bg-white/5" />

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
                                <div className="pt-2 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                    {/* Built-in track selector */}
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
                                            {/* Custom tracks as additional options */}
                                            {customTracks.map((ct, i) => (
                                                <SelectItem key={`custom_${i}`} value={`custom_${i}`} className="text-[10px] font-mono uppercase tracking-widest focus:text-primary focus:bg-white/5">
                                                    🎵 {ct.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>

                                    {/* Custom music upload section */}
                                    <div className="mt-3 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[9px] font-black text-indigo-950 uppercase tracking-widest">Your Music ({customTracks.length}/2)</span>
                                            <span className="text-[8px] text-slate-600 italic">MP3 only · max 5 min · resets on refresh</span>
                                        </div>

                                        {/* Existing custom tracks */}
                                        {customTracks.map((ct, i) => (
                                            <div
                                                key={i}
                                                className={`flex items-center justify-between p-2 rounded-xl border transition-all ${selectedMusic === `custom_${i}` ? 'border-primary/60 bg-primary/10' : 'border-white/10 bg-black/10'}`}
                                            >
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <Music className="w-3 h-3 text-indigo-950 shrink-0" />
                                                    <span
                                                        className="text-[9px] text-indigo-950 font-black uppercase tracking-wider truncate max-w-[160px] cursor-pointer"
                                                        onClick={() => onMusicChange(`custom_${i}`)}
                                                        title="Click to play"
                                                    >
                                                        {ct.name}
                                                    </span>
                                                </div>
                                                <button
                                                    onClick={() => handleDeleteCustomTrack(i)}
                                                    className="p-1 rounded-lg hover:bg-red-500/20 text-red-400 transition-colors shrink-0"
                                                    title="Delete track"
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ))}

                                        {/* Upload button (only show if < 2 custom tracks) */}
                                        {customTracks.length < 2 && (
                                            <>
                                                <button
                                                    onClick={() => fileInputRef.current?.click()}
                                                    className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl border border-dashed border-indigo-900/40 hover:border-indigo-900/80 hover:bg-black/10 transition-all"
                                                >
                                                    <Upload className="w-3 h-3 text-indigo-950" />
                                                    <span className="text-[9px] font-black text-indigo-950 uppercase tracking-widest">
                                                        Upload MP3 (max 5 min)
                                                    </span>
                                                </button>
                                                <input
                                                    ref={fileInputRef}
                                                    type="file"
                                                    accept=".mp3,audio/mpeg"
                                                    className="hidden"
                                                    onChange={handleFileUpload}
                                                />
                                            </>
                                        )}
                                    </div>
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
