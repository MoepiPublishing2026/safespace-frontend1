export const GRADE_AGE_RANGES: Record<string, { min: number; max: number }> = {
    Creche: { min: 0, max: 5 },
    "Grade R": { min: 5, max: 7 },
  
    "Grade 1": { min: 6, max: 8 },
    "Grade 2": { min: 7, max: 9 },
    "Grade 3": { min: 8, max: 10 },
  
    "Grade 4": { min: 9, max: 11 },
    "Grade 5": { min: 10, max: 12 },
    "Grade 6": { min: 11, max: 13 },
    "Grade 7": { min: 12, max: 14 },
  
    "Grade 8": { min: 13, max: 15 },
    "Grade 9": { min: 14, max: 16 },
  
    "Grade 10": { min: 15, max: 18 },
    "Grade 11": { min: 16, max: 19 },
    "Grade 12": { min: 17, max: 21 },
  
    College: { min: 16, max: 99 },
  };
  
  export const validateAgeGrade = (age: number, grade: string) => {
    const normalizedGrade = grade?.trim();
    const range = GRADE_AGE_RANGES[normalizedGrade];
  
    if (!range) {
      return { status: "error", message: "Invalid grade supplied" };
    }
  
    if (age < range.min || age > range.max) {
      return {
        status: "warning",
        message: `Age ${age} is unusual for ${normalizedGrade}`,
      };
    }
  
    return { status: "ok" };
  };