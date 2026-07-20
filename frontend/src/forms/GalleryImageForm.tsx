"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { InputWithLabel } from "@/components/common/InputWithLabel";
import { SelectWithLabel } from "@/components/common/SelectWithLabel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useRateLimit } from "@/hooks/useRateLimit";
import {
  galleryCategories,
  galleryCategoryLabels,
} from "@/lib/gallery";
import { sanitizeString } from "@/lib/sanitizer";
import {
  getGalleryImageSchema,
  type GalleryImageFormValues,
} from "@/validations/gallery-image.validation";

import type { GalleryImage } from "@/services/manager/gallery.api";

type GalleryImageFormProps = {
  open: boolean;
  initialData: GalleryImage | null;
  onClose: () => void;
  onSubmit: (data: GalleryImageFormValues) => Promise<void>;
};

const categoryOptions = galleryCategories.map((category) => ({
  value: category,
  label: galleryCategoryLabels[category],
}));

export function GalleryImageForm({
  open,
  initialData,
  onClose,
  onSubmit,
}: GalleryImageFormProps) {
  const imageRequired = initialData === null;
  const { attempt, canAttempt, cooldownRemaining, formatCooldownTime } =
    useRateLimit({
      maxAttempts: 10,
      cooldownMinutes: 1,
      storageKey: "gallery_image_form_rate_limit",
    });
  const {
    control,
    handleSubmit,
    register,
    reset,
    setError,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<GalleryImageFormValues>({
    resolver: zodResolver(getGalleryImageSchema(imageRequired)),
    defaultValues: {
      image: undefined,
      category: "interior",
      alt_text: "",
      display_order: 0,
    },
  });
  const selectedCategory = useWatch({ control, name: "category" });
  const [selectedPreviewUrl, setSelectedPreviewUrl] = useState<string | null>(
    null,
  );
  const previewUrl = selectedPreviewUrl ?? initialData?.image_url;

  useEffect(() => {
    reset({
      image: undefined,
      category: initialData?.category ?? "interior",
      alt_text: initialData?.alt_text ?? "",
      display_order: initialData?.display_order ?? 0,
    });
  }, [initialData, open, reset]);

  useEffect(() => {
    if (!selectedPreviewUrl) return;

    return () => URL.revokeObjectURL(selectedPreviewUrl);
  }, [selectedPreviewUrl]);

  const closeForm = () => {
    setSelectedPreviewUrl(null);
    onClose();
  };

  const submit = async (data: GalleryImageFormValues) => {
    if (imageRequired && !data.image) {
      setError("image", { message: "Please select an image" });
      return;
    }

    if (!attempt()) return;

    try {
      await onSubmit({
        ...data,
        alt_text: sanitizeString(data.alt_text),
      });
      setSelectedPreviewUrl(null);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not save gallery image",
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && closeForm()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {initialData ? "Edit Gallery Image" : "Add Gallery Image"}
          </DialogTitle>
          <DialogDescription>
            Upload a JPEG, PNG, or WebP image up to 5 MB. A 4:3 image is
            recommended for the landing-page grid.
          </DialogDescription>
        </DialogHeader>

        <form
          method="post"
          onSubmit={handleSubmit(submit)}
          className="space-y-5"
        >
          <div className="space-y-2">
            <InputWithLabel
              key={`${initialData?.id ?? "new"}-${open}`}
              id="gallery-image"
              label={initialData ? "Replace Image (optional)" : "Image"}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="h-10 cursor-pointer border-gray-300 file:mr-3"
              aria-invalid={Boolean(errors.image)}
              onChange={(event) => {
                const image = event.target.files?.[0];
                setSelectedPreviewUrl(image ? URL.createObjectURL(image) : null);
                setValue("image", image, {
                  shouldDirty: true,
                  shouldValidate: true,
                });
              }}
            />
            {errors.image && (
              <p className="text-xs text-red-500">{errors.image.message}</p>
            )}
          </div>

          {previewUrl && (
            <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-gray-200 bg-gray-100">
              <Image
                src={previewUrl}
                alt="Gallery image preview"
                fill
                unoptimized={previewUrl.startsWith("blob:")}
                sizes="(max-width: 640px) 100vw, 32rem"
                className="object-cover"
              />
            </div>
          )}

          <SelectWithLabel
            id="gallery-category"
            label="Category"
            options={categoryOptions}
            value={selectedCategory}
            onValueChange={(value) =>
              setValue(
                "category",
                value as GalleryImageFormValues["category"],
                { shouldValidate: true },
              )
            }
          />
          {errors.category && (
            <p className="-mt-3 text-xs text-red-500">
              {errors.category.message}
            </p>
          )}

          <div className="space-y-1">
            <InputWithLabel
              id="gallery-alt-text"
              label="Alt Text"
              placeholder="e.g., Barber shaping a customer's haircut"
              maxLength={160}
              aria-invalid={Boolean(errors.alt_text)}
              {...register("alt_text")}
            />
            <p className="text-xs text-gray-500">
              Briefly describe what appears in the image for accessibility.
            </p>
            {errors.alt_text && (
              <p className="text-xs text-red-500">
                {errors.alt_text.message}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <InputWithLabel
              id="gallery-display-order"
              label="Display Order"
              type="number"
              min={0}
              max={9999}
              aria-invalid={Boolean(errors.display_order)}
              {...register("display_order", { valueAsNumber: true })}
            />
            <p className="text-xs text-gray-500">
              Lower numbers appear first within the selected category.
            </p>
            {errors.display_order && (
              <p className="text-xs text-red-500">
                {errors.display_order.message}
              </p>
            )}
          </div>

          {!canAttempt && (
            <p className="text-sm text-red-500">
              Try again in {formatCooldownTime(cooldownRemaining)}.
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeForm}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !canAttempt}
              className="bg-red-500 text-white hover:bg-red-600"
            >
              {isSubmitting
                ? "Saving..."
                : initialData
                  ? "Update Image"
                  : "Add Image"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
