import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');
  const location = searchParams.get('location');
  const apiKey = process.env.SERPAPI_KEY;

  if (!q) {
    return NextResponse.json({ results: [] });
  }

  // If no API key is provided, return mock results for demonstration
  if (!apiKey) {
    return NextResponse.json({
      results: [
        { title: `${q} - Mock (Khu vực: ${location || 'Chung'})`, address: "Địa chỉ giả lập để test" },
        { title: `${q} - Bến xe`, address: `${location || 'Không xác định'}` },
      ]
    });
  }

  try {
    // Append location context to the search string to bias Google Maps
    const searchString = location ? `${q} ${location}` : q;
    // Use engine=google_maps as google_maps_autocomplete is returning 400
    const url = `https://serpapi.com/search.json?engine=google_maps&q=${encodeURIComponent(searchString)}&api_key=${apiKey}&gl=vn&hl=vi`;
    
    const res = await fetch(url);
    const data = await res.json();
    
    const results = [];
    
    // Exact place match
    if (data.place_results) {
      results.push({
        title: data.place_results.title || q,
        address: data.place_results.address || ''
      });
    }
    
    // Multiple local results
    if (data.local_results && Array.isArray(data.local_results)) {
      data.local_results.forEach((r: any) => {
        results.push({
          title: r.title,
          address: r.address || ''
        });
      });
    }
    
    // Fallback: If no results found from primary fields, try people_also_search_for
    if (results.length === 0 && data.people_also_search_for && data.people_also_search_for.length > 0) {
       const related = data.people_also_search_for[0].local_results;
       if (related && Array.isArray(related)) {
         related.forEach((r: any) => {
           results.push({
             title: r.title,
             address: r.address || ''
           });
         });
       }
    }

    return NextResponse.json({ results: results.slice(0, 5) });
  } catch (error) {
    console.error("SerpAPI Error:", error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
