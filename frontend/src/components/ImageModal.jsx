export default function ImageModal({
    image,
    onClose
}) {

    if (!image) return null;

    return (

        <div
            onClick={onClose}
            className="
                fixed
                inset-0
                bg-black/80
                flex
                items-center
                justify-center
                z-50
            "
        >

            <img
                src={image}
                alt=""
                onClick={(e)=>e.stopPropagation()}
                className="
                    max-w-[90%]
                    max-h-[90%]
                    rounded-xl
                    shadow-2xl
                "
            />

        </div>

    );

}
