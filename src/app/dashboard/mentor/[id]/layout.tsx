export async function generateStaticParams() {
    return [
        { id: 'default' }
    ];
}

export default function MentorProfileLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <>
            {children}
        </>
    );
}
