import { useState, useEffect, useRef } from 'react';
import { Store, Save, Upload, Building2, Phone, MapPin, CreditCard, Image, Download, Database } from 'lucide-react';
import { storeSettingsStorage, dataUtils } from '@/lib/supabaseStorage';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

export default function Settings() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);

  const [storeName, setStoreName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankAccountName, setBankAccountName] = useState('');

  useEffect(() => { fetchSettings(); }, []);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const settings = await storeSettingsStorage.get();
      setStoreName(settings.store_name);
      setAddress(settings.address || '');
      setPhone(settings.phone || '');
      setLogoUrl(settings.logo_url || '');
      setBankName(settings.bank_name || '');
      setBankAccountNumber(settings.bank_account_number || '');
      setBankAccountName(settings.bank_account_name || '');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan';
      toast.error('Gagal memuat pengaturan', { description: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!storeName.trim()) { toast.error('Nama toko wajib diisi'); return; }
    setIsSaving(true);
    try {
      await storeSettingsStorage.update({
        store_name: storeName.trim(),
        address: address.trim() || null,
        phone: phone.trim() || null,
        logo_url: logoUrl.trim() || null,
        bank_name: bankName.trim() || null,
        bank_account_number: bankAccountNumber.trim() || null,
        bank_account_name: bankAccountName.trim() || null,
      });
      toast.success('Pengaturan berhasil disimpan');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan';
      toast.error('Gagal menyimpan pengaturan', { description: errorMessage });
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportData = async () => {
    try {
      const data = await dataUtils.exportAllData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kasir37_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Data berhasil diekspor!');
    } catch (error) {
      toast.error('Gagal mengekspor data');
    }
  };

  if (isLoading) {
    return <MainLayout><div className="p-6 flex items-center justify-center min-h-[400px]"><div className="text-center"><div className="w-12 h-12 mx-auto mb-4 rounded-full gradient-bg animate-pulse" /><p className="text-muted-foreground">Memuat pengaturan...</p></div></div></MainLayout>;
  }

  return (
    <MainLayout>
      <div className="p-6 space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between">
          <div><h1 className="text-2xl font-bold text-foreground">Pengaturan Toko</h1><p className="text-muted-foreground">Kelola identitas toko untuk ditampilkan di nota/invoice</p></div>
          <Button onClick={handleSave} disabled={isSaving} className="gradient-bg text-primary-foreground"><Save className="h-4 w-4 mr-2" />{isSaving ? 'Menyimpan...' : 'Simpan'}</Button>
        </div>

        <Card className="glass-card">
          <CardHeader><CardTitle className="flex items-center gap-2"><Store className="h-5 w-5 text-primary" />Identitas Toko</CardTitle><CardDescription>Informasi dasar toko yang akan tampil di nota</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Nama Toko <span className="text-destructive">*</span></Label><div className="relative"><Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Nama toko Anda" value={storeName} onChange={(e) => setStoreName(e.target.value)} className="pl-10" /></div></div>
              <div className="space-y-2"><Label>No. Telepon</Label><div className="relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="08xxxxxxxxxx" value={phone} onChange={(e) => setPhone(e.target.value)} className="pl-10" /></div></div>
            </div>
            <div className="space-y-2"><Label>Alamat</Label><div className="relative"><MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Textarea placeholder="Alamat lengkap toko" value={address} onChange={(e) => setAddress(e.target.value)} className="pl-10 min-h-[80px]" rows={2} /></div></div>
            <div className="space-y-2">
              <Label>URL Logo</Label>
              <div className="relative"><Image className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="https://..." value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} className="pl-10" /></div>
              {logoUrl && <div className="mt-2 p-4 bg-secondary/30 rounded-lg flex items-center gap-4"><img src={logoUrl} alt="Logo Preview" className="h-16 w-16 object-contain rounded" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} /><span className="text-sm text-muted-foreground">Preview Logo</span></div>}
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader><CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5 text-primary" />Informasi Rekening Bank</CardTitle><CardDescription>Detail rekening untuk pembayaran transfer (opsional)</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2"><Label>Nama Bank</Label><Input placeholder="BCA, Mandiri, BRI, dll" value={bankName} onChange={(e) => setBankName(e.target.value)} /></div>
              <div className="space-y-2"><Label>Nomor Rekening</Label><Input placeholder="1234567890" value={bankAccountNumber} onChange={(e) => setBankAccountNumber(e.target.value)} /></div>
              <div className="space-y-2"><Label>Atas Nama</Label><Input placeholder="Nama pemilik rekening" value={bankAccountName} onChange={(e) => setBankAccountName(e.target.value)} /></div>
            </div>
          </CardContent>
        </Card>

        <Separator />

        <Card className="glass-card border-warning/50">
          <CardHeader><CardTitle className="flex items-center gap-2"><Database className="h-5 w-5 text-warning" />Backup Data</CardTitle><CardDescription>Ekspor data aplikasi dalam format JSON</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <Button variant="outline" onClick={handleExportData} className="h-20 flex-col gap-2 w-full md:w-auto"><Download className="h-6 w-6" /><span>Ekspor Data (JSON)</span></Button>
            <p className="text-sm text-muted-foreground">💾 Data sekarang disimpan ke database cloud Supabase. Ekspor data untuk backup lokal.</p>
          </CardContent>
        </Card>

        <div className="flex justify-end"><Button onClick={handleSave} disabled={isSaving} size="lg" className="gradient-bg text-primary-foreground"><Save className="h-4 w-4 mr-2" />{isSaving ? 'Menyimpan...' : 'Simpan Pengaturan'}</Button></div>
      </div>
    </MainLayout>
  );
}
