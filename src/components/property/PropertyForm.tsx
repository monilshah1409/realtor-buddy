import React, { useState, useRef } from 'react';
import {
  Upload,
  FileText,
  X,
  Image as ImageIcon,
  Loader2,
  CheckCircle2,
  MapPin,
  AlertCircle,
  Building2,
  DollarSign,
  Calendar,
  Maximize2,
  Bed,
  Bath,
  ExternalLink,
} from 'lucide-react';
import type { Property, PropertyType, HandoverStatus } from '../../types';
import { DUBAI_LOCALITIES, DUBAI_CLUSTERS } from '../../data/dubaiClusters';
import { uploadBrochureToOneDrive, compressAndUploadPhoto } from '../../services/storageService';

export interface PropertyFormProps {
  initialData?: Partial<Property>;
  onSubmit: (propertyData: Partial<Property>) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
  className?: string;
}

const PROPERTY_TYPES: { value: PropertyType; label: string }[] = [
  { value: 'studio', label: 'Studio Apartment' },
  { value: '1bhk', label: '1 Bedroom (1BHK)' },
  { value: '2bhk', label: '2 Bedroom (2BHK)' },
  { value: '3bhk', label: '3 Bedroom (3BHK)' },
  { value: '4bhk_plus', label: '4+ Bedroom (4BHK+)' },
  { value: 'villa', label: 'Villa' },
  { value: 'townhouse', label: 'Townhouse' },
  { value: 'penthouse', label: 'Penthouse' },
];

const HANDOVER_STATUSES: { value: HandoverStatus; label: string }[] = [
  { value: 'ready', label: 'Ready to Move In' },
  { value: 'near_handover', label: 'Near Handover' },
  { value: 'under_construction', label: 'Under Construction' },
  { value: 'newly_launched', label: 'Newly Launched' },
];

// Unique set of Dubai localities
const ALL_LOCALITIES: string[] = Array.from(
  new Set([
    ...DUBAI_LOCALITIES.map((l) => l.name),
    ...Object.keys(DUBAI_CLUSTERS),
  ])
).sort();

export const PropertyForm: React.FC<PropertyFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting = false,
  className = '',
}) => {
  // Form field state
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [locality, setLocality] = useState(initialData?.locality || '');
  const [subCommunity, setSubCommunity] = useState(initialData?.sub_community || '');
  const [propertyType, setPropertyType] = useState<PropertyType>(initialData?.property_type || '2bhk');
  const [handoverStatus, setHandoverStatus] = useState<HandoverStatus>(initialData?.handover_status || 'ready');
  const [handoverDate, setHandoverDate] = useState(initialData?.handover_date || 'Ready');
  const [priceAed, setPriceAed] = useState<string>(
    initialData?.price_aed !== undefined ? String(initialData.price_aed) : ''
  );
  const [developerName, setDeveloperName] = useState(initialData?.developer_name || '');
  const [bedrooms, setBedrooms] = useState<string>(
    initialData?.bedrooms !== undefined ? String(initialData.bedrooms) : '2'
  );
  const [bathrooms, setBathrooms] = useState<string>(
    initialData?.bathrooms !== undefined ? String(initialData.bathrooms) : '2'
  );
  const [areaSqft, setAreaSqft] = useState<string>(
    initialData?.area_sqft !== undefined ? String(initialData.area_sqft) : ''
  );
  const [latitude, setLatitude] = useState<string>(
    initialData?.latitude !== undefined ? String(initialData.latitude) : '25.2048'
  );
  const [longitude, setLongitude] = useState<string>(
    initialData?.longitude !== undefined ? String(initialData.longitude) : '55.2708'
  );

  // Photos & Brochure state
  const [photos, setPhotos] = useState<string[]>(initialData?.photos || []);
  const [brochureFileName, setBrochureFileName] = useState(initialData?.brochure_file_name || '');
  const [brochureOneDriveUrl, setBrochureOneDriveUrl] = useState(initialData?.brochure_onedrive_url || '');

  // Upload & UI states
  const [isUploadingBrochure, setIsUploadingBrochure] = useState(false);
  const [brochureUploadError, setBrochureUploadError] = useState<string | null>(null);
  const [isBrochureDragging, setIsBrochureDragging] = useState(false);

  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false);
  const [photoUploadError, setPhotoUploadError] = useState<string | null>(null);
  const [isPhotoDragging, setIsPhotoDragging] = useState(false);

  const [localSubmitting, setLocalSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const brochureInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Auto-populate coordinates on locality change
  const handleLocalityChange = (newLocality: string) => {
    setLocality(newLocality);
    const found = DUBAI_LOCALITIES.find((l) => l.name === newLocality);
    if (found) {
      setLatitude(String(found.coordinates.latitude));
      setLongitude(String(found.coordinates.longitude));
    }
  };

  // Brochure Upload Handlers
  const processBrochureFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      setBrochureUploadError('Please select a valid PDF brochure document.');
      return;
    }

    setBrochureUploadError(null);
    setIsUploadingBrochure(true);

    try {
      const result = await uploadBrochureToOneDrive(file);
      setBrochureFileName(result.fileName);
      setBrochureOneDriveUrl(result.embedUrl || result.webUrl);
    } catch (err: any) {
      setBrochureUploadError(err.message || 'Failed to upload brochure to OneDrive.');
    } finally {
      setIsUploadingBrochure(false);
    }
  };

  const handleBrochureFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processBrochureFile(file);
    }
    if (brochureInputRef.current) {
      brochureInputRef.current.value = '';
    }
  };

  const handleBrochureDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsBrochureDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processBrochureFile(file);
    }
  };

  const handleRemoveBrochure = () => {
    setBrochureFileName('');
    setBrochureOneDriveUrl('');
    setBrochureUploadError(null);
  };

  // Photo Upload Handlers
  const processPhotoFiles = async (fileList: FileList | File[]) => {
    const filesArray = Array.from(fileList);
    const imageFiles = filesArray.filter(
      (f) => f.type.startsWith('image/') || /\.(jpe?g|png|webp|avif)$/i.test(f.name)
    );

    if (imageFiles.length === 0) {
      setPhotoUploadError('Please select valid image files (JPEG, PNG, WebP).');
      return;
    }

    setPhotoUploadError(null);
    setIsUploadingPhotos(true);

    try {
      const uploadedUrls: string[] = [];
      for (const file of imageFiles) {
        const url = await compressAndUploadPhoto(file);
        uploadedUrls.push(url);
      }
      setPhotos((prev) => [...prev, ...uploadedUrls]);
    } catch (err: any) {
      setPhotoUploadError(err.message || 'Failed to upload photo(s).');
    } finally {
      setIsUploadingPhotos(false);
    }
  };

  const handlePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processPhotoFiles(e.target.files);
    }
    if (photoInputRef.current) {
      photoInputRef.current.value = '';
    }
  };

  const handlePhotoDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsPhotoDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processPhotoFiles(e.dataTransfer.files);
    }
  };

  const handleRemovePhoto = (indexToRemove: number) => {
    setPhotos((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // Validation
  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    if (!title.trim()) {
      errors.title = 'Property title is required';
    }
    if (!description.trim()) {
      errors.description = 'Property description is required';
    }
    if (!locality) {
      errors.locality = 'Please select a Dubai locality';
    }
    if (!priceAed || isNaN(Number(priceAed)) || Number(priceAed) <= 0) {
      errors.priceAed = 'Please enter a valid price in AED';
    }
    if (!developerName.trim()) {
      errors.developerName = 'Developer name is required';
    }
    if (!areaSqft || isNaN(Number(areaSqft)) || Number(areaSqft) <= 0) {
      errors.areaSqft = 'Please enter a valid area in sqft';
    }
    if (bedrooms === '' || isNaN(Number(bedrooms)) || Number(bedrooms) < 0) {
      errors.bedrooms = 'Bedrooms must be 0 or more';
    }
    if (!bathrooms || isNaN(Number(bathrooms)) || Number(bathrooms) < 1) {
      errors.bathrooms = 'Bathrooms must be 1 or more';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Guard against in-flight uploads
    if (isUploadingBrochure || isUploadingPhotos) {
      return;
    }
    if (!validate()) {
      return;
    }

    setLocalSubmitting(true);
    try {
      const propertyPayload: Partial<Property> = {
        ...(initialData || {}),
        title: title.trim(),
        description: description.trim(),
        locality,
        sub_community: subCommunity.trim() || undefined,
        property_type: propertyType,
        handover_status: handoverStatus,
        handover_date: handoverDate.trim() || 'Ready',
        price_aed: Number(priceAed),
        developer_name: developerName.trim(),
        bedrooms: Number(bedrooms),
        bathrooms: Number(bathrooms),
        area_sqft: Number(areaSqft),
        latitude: Number(latitude) || 25.2048,
        longitude: Number(longitude) || 55.2708,
        photos,
        brochure_file_name: brochureFileName || undefined,
        brochure_onedrive_url: brochureOneDriveUrl || undefined,
        // New agent submissions are automatically saved as private
        status: initialData?.status || 'private',
      };

      await onSubmit(propertyPayload);
    } finally {
      setLocalSubmitting(false);
    }
  };

  const submitting = isSubmitting || localSubmitting || isUploadingBrochure || isUploadingPhotos;

  return (
    <form
      onSubmit={handleSubmit}
      className={`bg-white rounded-2xl shadow-xl border border-slate-100 p-6 sm:p-8 space-y-8 max-w-4xl mx-auto ${className}`}
      noValidate
    >
      {/* Header */}
      <div className="border-b border-slate-200 pb-5">
        <h2 className="text-2xl font-bold text-slate-900">
          {initialData?.id ? 'Edit Dubai Property' : 'List New Dubai Property'}
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Add full property details, desktop PDF brochure (streamed directly to OneDrive), and high-res photos.
        </p>
      </div>

      {/* Basic Info Section */}
      <div className="space-y-4">
        <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-blue-600" />
          Basic Property Information
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label htmlFor="title" className="block text-sm font-medium text-slate-700 mb-1">
              Property Title *
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Burj Crown Luxury Residence"
              className={`w-full px-4 py-2.5 rounded-xl border ${
                formErrors.title ? 'border-red-500 focus:ring-red-200' : 'border-slate-200 focus:ring-blue-100'
              } text-slate-900 focus:outline-none focus:ring-4 transition-all`}
            />
            {formErrors.title && <p className="text-xs text-red-600 mt-1">{formErrors.title}</p>}
          </div>

          <div className="md:col-span-2">
            <label htmlFor="description" className="block text-sm font-medium text-slate-700 mb-1">
              Description *
            </label>
            <textarea
              id="description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed description of features, views, amenities, and layout..."
              className={`w-full px-4 py-2.5 rounded-xl border ${
                formErrors.description ? 'border-red-500 focus:ring-red-200' : 'border-slate-200 focus:ring-blue-100'
              } text-slate-900 focus:outline-none focus:ring-4 transition-all`}
            />
            {formErrors.description && <p className="text-xs text-red-600 mt-1">{formErrors.description}</p>}
          </div>

          <div>
            <label htmlFor="developer_name" className="block text-sm font-medium text-slate-700 mb-1">
              Developer Name *
            </label>
            <input
              id="developer_name"
              type="text"
              value={developerName}
              onChange={(e) => setDeveloperName(e.target.value)}
              placeholder="e.g. Emaar Properties, Damac, Meraas"
              className={`w-full px-4 py-2.5 rounded-xl border ${
                formErrors.developerName ? 'border-red-500' : 'border-slate-200'
              } text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all`}
            />
            {formErrors.developerName && <p className="text-xs text-red-600 mt-1">{formErrors.developerName}</p>}
          </div>

          <div>
            <label htmlFor="price_aed" className="block text-sm font-medium text-slate-700 mb-1">
              Price (AED) *
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 font-medium text-sm">
                AED
              </span>
              <input
                id="price_aed"
                type="number"
                min="0"
                step="1000"
                value={priceAed}
                onChange={(e) => setPriceAed(e.target.value)}
                placeholder="2500000"
                className={`w-full pl-14 pr-4 py-2.5 rounded-xl border ${
                  formErrors.priceAed ? 'border-red-500' : 'border-slate-200'
                } text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all`}
              />
            </div>
            {formErrors.priceAed && <p className="text-xs text-red-600 mt-1">{formErrors.priceAed}</p>}
          </div>

          <div>
            <label htmlFor="property_type" className="block text-sm font-medium text-slate-700 mb-1">
              Property Type *
            </label>
            <select
              id="property_type"
              value={propertyType}
              onChange={(e) => setPropertyType(e.target.value as PropertyType)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 bg-white focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all"
            >
              {PROPERTY_TYPES.map((pt) => (
                <option key={pt.value} value={pt.value}>
                  {pt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="area_sqft" className="block text-sm font-medium text-slate-700 mb-1">
              Area (sqft) *
            </label>
            <input
              id="area_sqft"
              type="number"
              min="0"
              value={areaSqft}
              onChange={(e) => setAreaSqft(e.target.value)}
              placeholder="e.g. 1250"
              className={`w-full px-4 py-2.5 rounded-xl border ${
                formErrors.areaSqft ? 'border-red-500' : 'border-slate-200'
              } text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all`}
            />
            {formErrors.areaSqft && <p className="text-xs text-red-600 mt-1">{formErrors.areaSqft}</p>}
          </div>

          <div>
            <label htmlFor="bedrooms" className="block text-sm font-medium text-slate-700 mb-1">
              Bedrooms *
            </label>
            <input
              id="bedrooms"
              type="number"
              min="0"
              value={bedrooms}
              onChange={(e) => setBedrooms(e.target.value)}
              placeholder="2"
              className={`w-full px-4 py-2.5 rounded-xl border ${
                formErrors.bedrooms ? 'border-red-500' : 'border-slate-200'
              } text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all`}
            />
            {formErrors.bedrooms && <p className="text-xs text-red-600 mt-1">{formErrors.bedrooms}</p>}
          </div>

          <div>
            <label htmlFor="bathrooms" className="block text-sm font-medium text-slate-700 mb-1">
              Bathrooms *
            </label>
            <input
              id="bathrooms"
              type="number"
              min="1"
              value={bathrooms}
              onChange={(e) => setBathrooms(e.target.value)}
              placeholder="2"
              className={`w-full px-4 py-2.5 rounded-xl border ${
                formErrors.bathrooms ? 'border-red-500' : 'border-slate-200'
              } text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all`}
            />
            {formErrors.bathrooms && <p className="text-xs text-red-600 mt-1">{formErrors.bathrooms}</p>}
          </div>

          <div>
            <label htmlFor="handover_status" className="block text-sm font-medium text-slate-700 mb-1">
              Handover Status *
            </label>
            <select
              id="handover_status"
              value={handoverStatus}
              onChange={(e) => setHandoverStatus(e.target.value as HandoverStatus)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 bg-white focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all"
            >
              {HANDOVER_STATUSES.map((hs) => (
                <option key={hs.value} value={hs.value}>
                  {hs.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="handover_date" className="block text-sm font-medium text-slate-700 mb-1">
              Handover Date
            </label>
            <input
              id="handover_date"
              type="text"
              value={handoverDate}
              onChange={(e) => setHandoverDate(e.target.value)}
              placeholder="e.g. Ready, Q4 2026, 2025-12"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Location Section */}
      <div className="space-y-4 pt-4 border-t border-slate-200">
        <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-emerald-600" />
          Location & Dubai Community
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="locality" className="block text-sm font-medium text-slate-700 mb-1">
              Locality *
            </label>
            <select
              id="locality"
              value={locality}
              onChange={(e) => handleLocalityChange(e.target.value)}
              className={`w-full px-4 py-2.5 rounded-xl border ${
                formErrors.locality ? 'border-red-500' : 'border-slate-200'
              } text-slate-900 bg-white focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all`}
            >
              <option value="">Select a Dubai community...</option>
              {ALL_LOCALITIES.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
            {formErrors.locality && <p className="text-xs text-red-600 mt-1">{formErrors.locality}</p>}
          </div>

          <div>
            <label htmlFor="sub_community" className="block text-sm font-medium text-slate-700 mb-1">
              Sub-Community
            </label>
            <input
              id="sub_community"
              type="text"
              value={subCommunity}
              onChange={(e) => setSubCommunity(e.target.value)}
              placeholder="e.g. Opera District, Marina Gate 2"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all"
            />
          </div>

          <div>
            <label htmlFor="latitude" className="block text-sm font-medium text-slate-700 mb-1">
              Latitude
            </label>
            <input
              id="latitude"
              type="number"
              step="any"
              value={latitude}
              onChange={(e) => setLatitude(e.target.value)}
              placeholder="25.1972"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all"
            />
          </div>

          <div>
            <label htmlFor="longitude" className="block text-sm font-medium text-slate-700 mb-1">
              Longitude
            </label>
            <input
              id="longitude"
              type="number"
              step="any"
              value={longitude}
              onChange={(e) => setLongitude(e.target.value)}
              placeholder="55.2744"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Desktop PDF Brochure Upload Section */}
      <div className="space-y-4 pt-4 border-t border-slate-200">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
            <FileText className="w-5 h-5 text-rose-600" />
            PDF Brochure (OneDrive Streaming)
          </h3>
          <span className="text-xs text-slate-500">Streams directly to OneDrive (0 Supabase storage)</span>
        </div>

        {brochureFileName ? (
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-rose-100 flex items-center justify-center text-rose-600 flex-shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate max-w-xs sm:max-w-md">
                  {brochureFileName}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    OneDrive Connected
                  </span>
                  {brochureOneDriveUrl && (
                    <a
                      href={brochureOneDriveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:text-blue-700 hover:underline inline-flex items-center gap-0.5"
                    >
                      View Link <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleRemoveBrochure}
              aria-label="Remove brochure"
              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsBrochureDragging(true);
            }}
            onDragLeave={() => setIsBrochureDragging(false)}
            onDrop={handleBrochureDrop}
            onClick={() => brochureInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
              isBrochureDragging
                ? 'border-blue-500 bg-blue-50'
                : 'border-slate-300 hover:border-slate-400 bg-slate-50/50'
            }`}
          >
            <input
              ref={brochureInputRef}
              data-testid="brochure-file-input"
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={handleBrochureFileChange}
              disabled={isUploadingBrochure}
            />

            {isUploadingBrochure ? (
              <div className="flex flex-col items-center justify-center py-2">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-2" />
                <p className="text-sm font-medium text-slate-700">Streaming PDF to Microsoft OneDrive...</p>
                <p className="text-xs text-slate-500 mt-1">Please wait while the brochure is uploaded</p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-2">
                <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 mb-3">
                  <Upload className="w-6 h-6" />
                </div>
                <p className="text-sm font-medium text-slate-700">
                  <span className="text-blue-600 font-semibold">Click to upload</span> or drag and drop desktop PDF
                </p>
                <p className="text-xs text-slate-500 mt-1">Official developer brochure (.pdf format)</p>
              </div>
            )}
          </div>
        )}

        {brochureUploadError && (
          <p className="text-xs text-red-600 flex items-center gap-1">
            <AlertCircle className="w-4 h-4" /> {brochureUploadError}
          </p>
        )}
      </div>

      {/* Photo Gallery Upload Section */}
      <div className="space-y-4 pt-4 border-t border-slate-200">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-emerald-600" />
            Property Photos
          </h3>
          <span className="text-xs text-slate-500">Auto-compressed to &lt;150KB for rapid mobile loading</span>
        </div>

        {/* Existing Photos Grid */}
        {photos.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {photos.map((photoUrl, idx) => (
              <div
                key={photoUrl + idx}
                className="relative group rounded-xl overflow-hidden aspect-video bg-slate-100 border border-slate-200"
              >
                <img
                  src={photoUrl}
                  alt={`Property photo ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => handleRemovePhoto(idx)}
                  aria-label="Remove photo"
                  className="absolute top-1.5 right-1.5 p-1 bg-black/60 hover:bg-red-600 text-white rounded-full transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Dropzone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsPhotoDragging(true);
          }}
          onDragLeave={() => setIsPhotoDragging(false)}
          onDrop={handlePhotoDrop}
          onClick={() => photoInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
            isPhotoDragging
              ? 'border-emerald-500 bg-emerald-50'
              : 'border-slate-300 hover:border-slate-400 bg-slate-50/50'
          }`}
        >
          <input
            ref={photoInputRef}
            data-testid="photos-file-input"
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handlePhotoFileChange}
            disabled={isUploadingPhotos}
          />

          {isUploadingPhotos ? (
            <div className="flex flex-col items-center justify-center py-2">
              <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mb-2" />
              <p className="text-sm font-medium text-slate-700">Compressing and uploading photos...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-2">
              <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 mb-3">
                <ImageIcon className="w-6 h-6" />
              </div>
              <p className="text-sm font-medium text-slate-700">
                <span className="text-emerald-600 font-semibold">Click to upload</span> or drag multiple photos
              </p>
              <p className="text-xs text-slate-500 mt-1">PNG, JPG, WebP up to 10MB each</p>
            </div>
          )}
        </div>

        {photoUploadError && (
          <p className="text-xs text-red-600 flex items-center gap-1">
            <AlertCircle className="w-4 h-4" /> {photoUploadError}
          </p>
        )}
      </div>

      {/* Form Action Buttons */}
      <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-200">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-100 transition-all disabled:opacity-50"
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={submitting}
          className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-md shadow-blue-500/20 focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all disabled:opacity-50 flex items-center gap-2"
        >
          {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
          {isUploadingBrochure
            ? 'Uploading Brochure...'
            : isUploadingPhotos
            ? 'Uploading Photos...'
            : initialData?.id
            ? 'Save Property'
            : 'Create Property'}
        </button>
      </div>
    </form>
  );
};
