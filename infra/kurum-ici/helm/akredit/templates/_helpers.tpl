{{- define "akredit.imaj" -}}
{{- $kd := .kok.Values.imajlar.kayitDefteri -}}
{{- if $kd }}{{ $kd }}/{{ end }}{{ .ad }}
{{- end -}}

{{- define "akredit.surum" -}}
{{- required "surum zorunlu: --set surum=vX.Y.Z" .Values.surum -}}
{{- end -}}

{{- define "akredit.etiketler" -}}
app.kubernetes.io/part-of: akredit
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end -}}

{{- define "akredit.modelAdresi" -}}
{{- if eq .Values.yz.sunucu "vllm" -}}
http://{{ .Release.Name }}-model:8000/v1
{{- else -}}
http://{{ .Release.Name }}-model:11434/v1
{{- end -}}
{{- end -}}

{{- define "akredit.uygulamaOrtami" -}}
- name: NODE_ENV
  value: production
- name: POSTGRES_PASSWORD
  valueFrom: { secretKeyRef: { name: {{ .Values.gizliNesne }}, key: POSTGRES_PASSWORD } }
- name: AKREDIT_VT_ADRES
  value: postgres://{{ .Values.vt.kullanici }}:$(POSTGRES_PASSWORD)@{{ .Release.Name }}-vt:5432/{{ .Values.vt.ad }}
- name: AKREDIT_TAKMA_AD_ANAHTARI
  valueFrom: { secretKeyRef: { name: {{ .Values.gizliNesne }}, key: AKREDIT_TAKMA_AD_ANAHTARI } }
- name: S3_UC_NOKTASI
  value: {{ .Values.s3.ucNoktasi | quote }}
- name: S3_BOLGE
  value: {{ .Values.s3.bolge | quote }}
- name: S3_KOVA
  value: {{ .Values.s3.kova | quote }}
- name: S3_ERISIM_ANAHTARI
  valueFrom: { secretKeyRef: { name: {{ .Values.gizliNesne }}, key: S3_ERISIM_ANAHTARI } }
- name: S3_GIZLI_ANAHTAR
  valueFrom: { secretKeyRef: { name: {{ .Values.gizliNesne }}, key: S3_GIZLI_ANAHTAR } }
- name: SMTP_ADRESI
  value: {{ .Values.smtp | quote }}
- name: AKREDIT_YZ_HAZIR
  value: {{ .Values.yz.sunucu | quote }}
- name: AKREDIT_YZ_ADRES
  value: {{ include "akredit.modelAdresi" . | quote }}
- name: AKREDIT_YZ_MODEL
  value: {{ .Values.yz.model | quote }}
- name: AKREDIT_YZ_YURT_DISI_IZIN
  value: "hayir"
{{- end -}}
