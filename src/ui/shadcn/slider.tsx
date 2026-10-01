import { type ComponentProps, useMemo } from "react"; // 09.03.2026
import { Slider as SliderPrimitive } from "radix-ui";
import { cn } from "@/utils/classnames";

export function Slider({ className, defaultValue, value, min = 0, max = 100, ...props }: ComponentProps<typeof SliderPrimitive.Root>) {
    const _values = useMemo(
        () => (
            Array.isArray(value) ? value
                : Array.isArray(defaultValue) ? defaultValue
                    : [min, max]
        ),
        [value, defaultValue, min, max]);

    return (
        <SliderPrimitive.Root data-slot="slider" className={cn(sliderClasses, className)} defaultValue={defaultValue} value={value} min={min} max={max} {...props}>

            <SliderPrimitive.Track data-slot="slider-track" className={trackClasses}>
                <SliderPrimitive.Range data-slot="slider-range" className={rangeClasses} />
            </SliderPrimitive.Track>

            {Array.from({ length: _values.length },
                (_, index) => <SliderPrimitive.Thumb data-slot="slider-thumb" className={thumbClasses} key={index} />

            )}
        </SliderPrimitive.Root>
    );
}

const sliderClasses = "\
relative w-full \
\
data-disabled:opacity-50 \
\
data-vertical:h-full \
data-vertical:min-h-40 \
data-vertical:w-auto \
data-vertical:flex-col \
\
flex items-center touch-none select-none";

const trackClasses = "\
grow \
relative \
bg-muted \
\
data-horizontal:h-0.75 \
data-horizontal:w-full \
\
data-vertical:h-full \
data-vertical:w-0.75 \
\
rounded-full overflow-hidden \
";

const rangeClasses = "\
absolute \
bg-primary \
select-none \
data-horizontal:h-full \
data-vertical:w-full \
";

const thumbClasses = "\
shrink-0 block relative size-3 \
bg-white \
border \
border-ring \
ring-ring/50 \
\
transition-[color,box-shadow] \
\
after:absolute \
after:-inset-2 \
\
hover:ring-2 \
\
focus-visible:ring-1 \
focus-visible:outline-hidden \
\
active:ring-1 \
\
disabled:pointer-events-none \
disabled:opacity-50 \
\
rounded-sm select-none \
";
