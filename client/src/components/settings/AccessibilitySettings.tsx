import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// UI Components
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

// Constants and types
const COLOR_SCHEMES = [
  { id: "default", name: "Default", background: "#ffffff", text: "#000000" },
  { id: "cream", name: "Cream Paper", background: "#f8f5e4", text: "#333333" },
  { id: "dark", name: "Dark Mode", background: "#1a1a1a", text: "#f5f5f5" },
  { id: "blue", name: "Blue Tint", background: "#e8f0fa", text: "#333333" },
  { id: "yellow", name: "Yellow Tint", background: "#fafae0", text: "#333333" },
];

const FONTS = [
  { id: "default", name: "Default System Font", family: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" },
  { id: "opendyslexic", name: "OpenDyslexic", family: "'OpenDyslexic', sans-serif" },
  { id: "comic", name: "Comic Sans", family: "'Comic Sans MS', cursive, sans-serif" },
  { id: "arial", name: "Arial", family: "Arial, sans-serif" },
  { id: "verdana", name: "Verdana", family: "Verdana, sans-serif" },
];

interface UserAccessibilityPreferences {
  textSize: number;
  colorSchemeId: string;
  fontId: string;
  reduceAnimations: boolean;
  highContrast: boolean;
}

const defaultPreferences: UserAccessibilityPreferences = {
  textSize: 16,
  colorSchemeId: "default",
  fontId: "default",
  reduceAnimations: false,
  highContrast: false,
};

// Form validation schema
const formSchema = z.object({
  textSize: z.number().min(12).max(24),
  colorSchemeId: z.string(),
  fontId: z.string(),
  reduceAnimations: z.boolean(),
  highContrast: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

// Preview component
const AccessibilityPreview = ({ 
  preferences 
}: { 
  preferences: UserAccessibilityPreferences 
}) => {
  const colorScheme = COLOR_SCHEMES.find(scheme => scheme.id === preferences.colorSchemeId) || COLOR_SCHEMES[0];
  const font = FONTS.find(font => font.id === preferences.fontId) || FONTS[0];
  
  const previewStyle = {
    backgroundColor: colorScheme.background,
    color: colorScheme.text,
    fontFamily: font.family,
    fontSize: `${preferences.textSize}px`,
    padding: "20px",
    borderRadius: "8px",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
    margin: "20px 0",
    transition: preferences.reduceAnimations ? "none" : "all 0.3s ease",
    border: preferences.highContrast ? "2px solid #000" : "1px solid #ddd",
  };

  return (
    <div style={previewStyle}>
      <h3 style={{ fontWeight: "bold", marginBottom: "10px" }}>Preview Text</h3>
      <p>
        This is a preview of how text will appear with your current accessibility settings.
        Adjust the settings to make content easier to read.
      </p>
    </div>
  );
};

export function AccessibilitySettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [previewPreferences, setPreviewPreferences] = useState<UserAccessibilityPreferences>(defaultPreferences);

  // Fetch user's saved preferences
  const { data: savedPreferences, isLoading, error } = useQuery({
    queryKey: ["/api/user/accessibility-preferences"],
    // If API returns error, it will be caught in the useEffect below
  });

  // Update preferences mutation
  const mutation = useMutation({
    mutationFn: async (preferences: UserAccessibilityPreferences) => {
      const response = await fetch("/api/user/accessibility-preferences", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(preferences),
      });
      
      if (!response.ok) {
        throw new Error("Failed to save preferences");
      }
      
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/accessibility-preferences"] });
      toast({
        title: "Settings saved",
        description: "Your accessibility preferences have been updated.",
      });
      
      // Apply the settings to the document
      applyPreferencesToDocument(previewPreferences);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save your accessibility preferences. Please try again.",
        variant: "destructive",
      });
    },
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      textSize: defaultPreferences.textSize,
      colorSchemeId: defaultPreferences.colorSchemeId,
      fontId: defaultPreferences.fontId,
      reduceAnimations: defaultPreferences.reduceAnimations,
      highContrast: defaultPreferences.highContrast,
    },
  });

  // Initialize preferences with defaults while loading
  useEffect(() => {
    if (isLoading) {
      // While loading, use default preferences 
      form.reset(defaultPreferences);
      setPreviewPreferences(defaultPreferences);
      applyPreferencesToDocument(defaultPreferences);
    } else if (savedPreferences) {
      // Once loaded, use saved preferences
      const typedPreferences = savedPreferences as UserAccessibilityPreferences;
      // Ensure all required fields exist (fallback to defaults if any are missing)
      const validPreferences: UserAccessibilityPreferences = {
        textSize: typedPreferences.textSize ?? defaultPreferences.textSize,
        colorSchemeId: typedPreferences.colorSchemeId ?? defaultPreferences.colorSchemeId,
        fontId: typedPreferences.fontId ?? defaultPreferences.fontId,
        reduceAnimations: typedPreferences.reduceAnimations ?? defaultPreferences.reduceAnimations,
        highContrast: typedPreferences.highContrast ?? defaultPreferences.highContrast
      };
      
      form.reset(validPreferences);
      setPreviewPreferences(validPreferences);
      applyPreferencesToDocument(validPreferences);
    } else if (error) {
      // If there's an error, use default preferences
      console.warn("Error loading accessibility preferences, using defaults:", error);
      form.reset(defaultPreferences);
      setPreviewPreferences(defaultPreferences);
      applyPreferencesToDocument(defaultPreferences);
    }
  }, [savedPreferences, error, isLoading, form]);

  const onSubmit = (values: FormValues) => {
    const preferences: UserAccessibilityPreferences = {
      textSize: values.textSize,
      colorSchemeId: values.colorSchemeId,
      fontId: values.fontId,
      reduceAnimations: values.reduceAnimations,
      highContrast: values.highContrast,
    };
    
    mutation.mutate(preferences);
  };

  const applyPreferencesToPreview = (prefs: UserAccessibilityPreferences) => {
    setPreviewPreferences(prefs);
  };

  const applyPreferencesToDocument = (prefs: UserAccessibilityPreferences) => {
    const colorScheme = COLOR_SCHEMES.find(scheme => scheme.id === prefs.colorSchemeId) || COLOR_SCHEMES[0];
    const font = FONTS.find(font => font.id === prefs.fontId) || FONTS[0];
    
    // Add a CSS class to the body for app-wide settings
    document.body.classList.forEach(cls => {
      if (cls.startsWith('theme-')) {
        document.body.classList.remove(cls);
      }
    });
    
    document.body.classList.add(`theme-${prefs.colorSchemeId}`);
    
    // Create or update the style element for custom user preferences
    let styleElement = document.getElementById('user-accessibility-styles');
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = 'user-accessibility-styles';
      document.head.appendChild(styleElement);
    }
    
    styleElement.textContent = `
      :root {
        --user-font-size: ${prefs.textSize}px;
        --user-font-family: ${font.family};
        --user-bg-color: ${colorScheme.background};
        --user-text-color: ${colorScheme.text};
        --user-transition: ${prefs.reduceAnimations ? 'none' : 'all 0.3s ease'};
      }
      
      body {
        font-family: var(--user-font-family);
        font-size: var(--user-font-size);
        background-color: var(--user-bg-color);
        color: var(--user-text-color);
      }
      
      * {
        transition: var(--user-transition) !important;
      }
      
      ${prefs.highContrast ? `
        a, button, .btn, .button {
          border: 2px solid currentColor !important;
          text-decoration: underline !important;
        }
        
        h1, h2, h3, h4, h5, h6 {
          font-weight: 900 !important;
        }
      ` : ''}
    `;
  };

  // Update preview when form values change
  useEffect(() => {
    const subscription = form.watch((value) => {
      applyPreferencesToPreview(value as UserAccessibilityPreferences);
    });
    return () => subscription.unsubscribe();
  }, [form.watch]);

  if (isLoading) {
    return <div>Loading preferences...</div>;
  }

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>Accessibility Settings</CardTitle>
        <CardDescription>
          Customize how content appears to make it easier to read and interact with the platform.
          These settings are especially helpful for users with dyslexia or visual impairments.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <AccessibilityPreview preferences={previewPreferences} />
            
            <FormField
              control={form.control}
              name="textSize"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Text Size: {field.value}px</FormLabel>
                  <FormControl>
                    <Slider
                      min={12}
                      max={24}
                      step={1}
                      value={[field.value]}
                      onValueChange={(value) => field.onChange(value[0])}
                    />
                  </FormControl>
                  <FormDescription>
                    Adjust the size of text throughout the application.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="colorSchemeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Color Scheme</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a color scheme" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {COLOR_SCHEMES.map((scheme) => (
                        <SelectItem key={scheme.id} value={scheme.id}>
                          {scheme.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Different background colors can help with reading comfort.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="fontId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Font</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a font" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {FONTS.map((font) => (
                        <SelectItem key={font.id} value={font.id}>
                          {font.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Some fonts like OpenDyslexic are designed to be easier to read for people with dyslexia.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="reduceAnimations"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Reduce Animations</FormLabel>
                    <FormDescription>
                      Turn off most animations and transitions throughout the interface.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="highContrast"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">High Contrast</FormLabel>
                    <FormDescription>
                      Increase contrast between text and background for better readability.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            
            <Button 
              type="submit" 
              className="w-full"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? "Saving..." : "Save Preferences"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}