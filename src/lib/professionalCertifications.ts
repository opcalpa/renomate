export interface CertificationPreset {
  name: string;
  issuer: string;
  labelKey: string;
}

export const CERTIFICATION_PRESETS: Record<string, CertificationPreset[]> = {
  builder: [
    { name: "BF9K", issuer: "BF9K", labelKey: "certifications.bf9k" },
    { name: "Säker Vatteninstallation", issuer: "Säker Vatten", labelKey: "certifications.sakerVatteninstallation" },
    { name: "ID06", issuer: "ID06 AB", labelKey: "certifications.id06" },
    { name: "Bas-P/Bas-U", issuer: "Arbetsmiljöverket", labelKey: "certifications.basPU" },
    { name: "Kontrollansvarig (KA)", issuer: "Boverket", labelKey: "certifications.ka" },
  ],
  electrician: [
    { name: "Auktoriserad Elinstallatör", issuer: "Elsäkerhetsverket", labelKey: "certifications.auktElinstallator" },
    { name: "ESA Elinstallation", issuer: "Installatörsföretagen", labelKey: "certifications.esaEl" },
    { name: "ID06", issuer: "ID06 AB", labelKey: "certifications.id06" },
  ],
  plumber: [
    { name: "Säker Vatten", issuer: "Säker Vatten", labelKey: "certifications.sakerVatten" },
    { name: "Auktoriserad VVS-installatör", issuer: "Säker Vatten", labelKey: "certifications.auktVVS" },
    { name: "ID06", issuer: "ID06 AB", labelKey: "certifications.id06" },
  ],
  painter: [
    { name: "Auktoriserad Målare (MÅ)", issuer: "Måleriföretagen", labelKey: "certifications.auktMalare" },
    { name: "ID06", issuer: "ID06 AB", labelKey: "certifications.id06" },
  ],
  tiler: [
    { name: "GVK Behörig", issuer: "GVK", labelKey: "certifications.gvk" },
    { name: "BKR Behörig", issuer: "BKR", labelKey: "certifications.bkr" },
    { name: "Säker Vatten", issuer: "Säker Vatten", labelKey: "certifications.sakerVatten" },
    { name: "ID06", issuer: "ID06 AB", labelKey: "certifications.id06" },
  ],
  carpenter: [
    { name: "Hantverksmästare", issuer: "Hantverkarnas Riksorganisation", labelKey: "certifications.hantverksmastare" },
    { name: "ID06", issuer: "ID06 AB", labelKey: "certifications.id06" },
  ],
  architect: [
    { name: "SAR/MSA", issuer: "Sveriges Arkitekter", labelKey: "certifications.sarMsa" },
    { name: "Certifierad Kontrollansvarig (KA)", issuer: "Boverket", labelKey: "certifications.certKa" },
  ],
  roofer: [
    { name: "TIB Certifierad", issuer: "TIB", labelKey: "certifications.tib" },
    { name: "ID06", issuer: "ID06 AB", labelKey: "certifications.id06" },
  ],
  landscaper: [
    { name: "Trädgårdsmästare", issuer: "SLU", labelKey: "certifications.tradgardsmastare" },
    { name: "ID06", issuer: "ID06 AB", labelKey: "certifications.id06" },
  ],
};
